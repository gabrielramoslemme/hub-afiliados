import { clientAddress } from './client-address';

describe('clientAddress', () => {
  it('reads the visitor that CloudFront saw, without the port', () => {
    expect(clientAddress({ 'cloudfront-viewer-address': '198.51.100.10:46532' }, '10.0.0.5')).toBe(
      '198.51.100.10',
    );
  });

  it('keeps every group of an IPv6 address, dropping only the port', () => {
    expect(
      clientAddress({ 'cloudfront-viewer-address': '2001:db8::8a2e:370:7334:46532' }, '10.0.0.5'),
    ).toBe('2001:db8::8a2e:370:7334');
  });

  // Fora da AWS não há CloudFront: em desenvolvimento e no e2e, quem conecta é
  // o próprio visitante.
  it('falls back to the address of the connection when CloudFront is not in front', () => {
    expect(clientAddress({}, '127.0.0.1')).toBe('127.0.0.1');
  });

  // O Caddy reescreve o X-Forwarded-For com o IP do CloudFront, e o que chega
  // nele do navegador é inventável: contar por ele juntaria todo mundo numa
  // chave só, ou deixaria cada um escolher a própria.
  it('never trusts X-Forwarded-For', () => {
    expect(clientAddress({ 'x-forwarded-for': '203.0.113.7, 192.0.2.1' }, '10.0.0.5')).toBe(
      '10.0.0.5',
    );
  });
});
