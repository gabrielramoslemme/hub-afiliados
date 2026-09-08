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
 */
const isDev = process.env.NODE_ENV !== 'production';

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  // Nada embute este app. Se a Porto for embutir a landing um dia, o valor
  // vira a origem dela — não `*`.
  "frame-ancestors 'none'",
  "form-action 'self'",
  // `unsafe-eval` é o React Refresh; ele não existe no build de produção.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  // `next/font` serve a Open Sans da própria origem.
  "font-src 'self'",
  // `ws:` é o socket do Fast Refresh.
  `connect-src 'self'${isDev ? ' ws:' : ''}`,
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@porto/contracts'],
  poweredByHeader: false,
  experimental: {
    // O Server Action do cadastro recebe cinco campos curtos; 1MB é folga de sobra
    // e fecha a porta para corpo grande em rota pública.
    serverActions: { bodySizeLimit: '1mb' },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Content-Security-Policy', value: contentSecurityPolicy }],
      },
    ];
  },
};

export default nextConfig;
