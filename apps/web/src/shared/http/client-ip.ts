/**
 * O IP de quem está do outro lado, lido só de quem o pôs ali. Sem a Imperva, é
 * o `CloudFront-Viewer-Address`, que o CloudFront escreve por cima do que vier
 * do navegador (exige a política de origem com os headers do CloudFront). Com a
 * Imperva na frente, o CloudFront vê a Imperva, e o visitante vem no
 * `Incap-Client-IP` dela.
 *
 * Nulo quando nenhum dos dois veio: em desenvolvimento, ou com a política de
 * origem errada. Quem chama decide o que fazer sem um IP em que confiar.
 */
export function clientIp(headers: Headers): string | null {
  const impervaVisitor = headers.get('incap-client-ip')?.trim();
  if (impervaVisitor) return impervaVisitor;

  // `ip:porta`, e no IPv6 o próprio endereço tem dois-pontos: só o último
  // separa a porta.
  const viewerAddress = headers.get('cloudfront-viewer-address')?.trim();
  if (viewerAddress?.includes(':')) {
    return viewerAddress.slice(0, viewerAddress.lastIndexOf(':'));
  }

  return null;
}
