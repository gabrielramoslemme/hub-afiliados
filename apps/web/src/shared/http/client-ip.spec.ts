import { clientIp } from './client-ip';

describe('clientIp', () => {
  it('reads the address of the visitor that CloudFront saw, without the port', () => {
    const headers = new Headers({ 'cloudfront-viewer-address': '198.51.100.10:46532' });

    expect(clientIp(headers)).toBe('198.51.100.10');
  });

  it('keeps every group of an IPv6 address, dropping only the port', () => {
    const headers = new Headers({ 'cloudfront-viewer-address': '2001:db8::8a2e:370:7334:46532' });

    expect(clientIp(headers)).toBe('2001:db8::8a2e:370:7334');
  });

  // Com a Imperva na frente, quem o CloudFront vê é a Imperva: o visitante vem
  // no header dela.
  it('prefers the visitor the Imperva saw over the address CloudFront saw', () => {
    const headers = new Headers({
      'incap-client-ip': '203.0.113.7',
      'cloudfront-viewer-address': '192.0.2.1:443',
    });

    expect(clientIp(headers)).toBe('203.0.113.7');
  });

  // O Caddy reescreve o X-Forwarded-For com o IP do CloudFront, e o que o
  // navegador manda nele é inventável: contar por ele juntaria todo mundo ou
  // deixaria cada um escolher a própria chave.
  it('never trusts X-Forwarded-For', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.7, 192.0.2.1' });

    expect(clientIp(headers)).toBeNull();
  });
});
