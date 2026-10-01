import { securityHeaders } from './security-headers.mjs';

function headerOf(production: boolean, key: string): string | undefined {
  return securityHeaders({ production }).find((header) => header.key === key)?.value;
}

describe('securityHeaders', () => {
  /*
    O TLS termina no CloudFront: sem HSTS, o primeiro acesso por http fica à
    mercê de quem estiver no meio do caminho até o redirecionamento.
  */
  it('pins https for two years in production, subdomains included', () => {
    expect(headerOf(true, 'Strict-Transport-Security')).toBe('max-age=63072000; includeSubDomains');
  });

  // Em `localhost` o HSTS prenderia o navegador de quem desenvolve ao https.
  it('does not pin https outside production', () => {
    expect(headerOf(false, 'Strict-Transport-Security')).toBeUndefined();
  });

  it.each([true, false])('forbids guessing the content type (production: %s)', (production) => {
    expect(headerOf(production, 'X-Content-Type-Options')).toBe('nosniff');
  });

  // O endereço do painel carrega o `public_id` do afiliado: só a origem sai dele.
  it('sends only the origin to other sites', () => {
    expect(headerOf(true, 'Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });

  it.each(['camera', 'microphone', 'geolocation', 'payment', 'usb'])(
    'denies %s to the page and to every frame in it',
    (feature) => {
      expect(headerOf(true, 'Permissions-Policy')?.split(', ')).toContain(`${feature}=()`);
    },
  );

  // Os players da trilha de formação abrem em tela cheia.
  it('keeps fullscreen for the training videos', () => {
    expect(headerOf(true, 'Permissions-Policy')).not.toContain('fullscreen');
  });

  it('keeps the content security policy, without eval in production', () => {
    const policy = headerOf(true, 'Content-Security-Policy');

    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain("'unsafe-eval'");
  });
});
