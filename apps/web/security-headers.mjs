/*
  Os cabeçalhos de segurança de toda resposta da web. Moram fora do
  `next.config.mjs` para o teste chegar a eles sem carregar a configuração
  inteira do Next.
*/

/**
 * O painel e a parte pública dividem origem, então o CSP vale para as duas —
 * `headers()` cobre toda rota, inclusive a landing, que o `middleware` não
 * casa.
 *
 * **Ele não impede XSS.** O App Router injeta o payload do RSC em `<script>`
 * inline, e sem nonce isso exige `'unsafe-inline'`. Fechar essa porta pediria
 * nonce por requisição, gerado no `middleware` — e nonce torna toda página
 * dinâmica, o que custaria a renderização estática da landing. A troca não
 * compensa enquanto o CSP for a segunda linha de defesa, não a primeira.
 *
 * O que ele impede, e que é o motivo de existir: script de outra origem,
 * exfiltração por `fetch` ou formulário para fora (`connect-src`,
 * `form-action`), sequestro de URL relativa por `<base>` e clickjacking.
 * `connect-src 'self'` também escreve no navegador a regra que a aplicação já
 * segue — o navegador não fala com a API.
 *
 * @param {boolean} production
 * @returns {string}
 */
function contentSecurityPolicy(production) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    // Nada embute este app. Se a Porto for embutir a landing um dia, o valor
    // vira a origem dela — não `*`.
    "frame-ancestors 'none'",
    "form-action 'self'",
    // `unsafe-eval` é o React Refresh; ele não existe no build de produção.
    `script-src 'self' 'unsafe-inline'${production ? '' : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    // As capas dos vídeos da trilha: o CDN de miniaturas do YouTube e o do Vimeo.
    "img-src 'self' data: blob: https://i.ytimg.com https://i.vimeocdn.com",
    // Os vídeos da trilha de formação: os players do YouTube (o domínio sem
    // cookie) e do Vimeo, e o arquivo direto em qualquer host https que o
    // operador cadastrar — a API só aceita endereço https.
    'frame-src https://www.youtube-nocookie.com https://player.vimeo.com',
    "media-src 'self' https:",
    // `next/font` serve a Open Sans da própria origem.
    "font-src 'self'",
    // `ws:` é o socket do Fast Refresh.
    `connect-src 'self'${production ? '' : ' ws:'}`,
    ...(production ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

/*
  Nada aqui usa câmera, microfone, localização, pagamento ou periférico. Negado
  no topo, vale também para todo iframe da página — os players de vídeo
  inclusive. Tela cheia fica de fora: é dela que os players precisam.
*/
const DENIED_FEATURES = [
  'camera',
  'microphone',
  'geolocation',
  'payment',
  'usb',
  'serial',
  'bluetooth',
  'hid',
  'midi',
  'browsing-topics',
];

/**
 * @param {{ production: boolean }} options
 * @returns {{ key: string; value: string }[]}
 */
export function securityHeaders({ production }) {
  return [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy(production) },
    // O TLS termina no CloudFront. Só em produção: em `localhost` o navegador
    // de quem desenvolve ficaria preso ao https.
    ...(production
      ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]
      : []),
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    // O endereço do painel carrega o `public_id` do afiliado: para outro site,
    // sai só a origem.
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: DENIED_FEATURES.map((feature) => `${feature}=()`).join(', '),
    },
  ];
}
