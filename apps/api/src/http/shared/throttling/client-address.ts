type Headers = Record<string, string | string[] | undefined>;

/**
 * Quem está do outro lado, para contar as tentativas. Atrás da AWS é o
 * `CloudFront-Viewer-Address`, que o CloudFront escreve por cima do que vier do
 * navegador — a política de origem da stack o pede, e sem ela o header seria
 * do visitante. O Next repassa o mesmo header quando chama a API em nome de
 * quem está na tela.
 *
 * O `X-Forwarded-For` nunca: o Caddy o reescreve com o IP do CloudFront, e o que
 * chega nele antes disso é inventável.
 */
export function clientAddress(headers: Headers, connectionAddress: string): string {
  const viewer = headers['cloudfront-viewer-address'];
  const value = (Array.isArray(viewer) ? viewer[0] : viewer)?.trim();

  // `ip:porta`, e no IPv6 o próprio endereço tem dois-pontos: só o último
  // separa a porta.
  if (value?.includes(':')) return value.slice(0, value.lastIndexOf(':'));

  return connectionAddress;
}
