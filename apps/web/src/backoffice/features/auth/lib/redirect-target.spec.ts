import { safeAdminTarget } from './redirect-target';

/**
 * O destino vem da query string, então vem de quem clicou no link. Um valor não
 * conferido aqui é redirecionamento aberto: o phishing manda a vítima para o
 * nosso `/admin/login` e, depois do login, para o domínio dele.
 */
describe('safeAdminTarget', () => {
  it('keeps a path inside the panel', () => {
    expect(safeAdminTarget('/admin/afiliados/10000000-0000-4000-8000-000000000001')).toBe(
      '/admin/afiliados/10000000-0000-4000-8000-000000000001',
    );
  });

  it('keeps the query string of the destination', () => {
    expect(safeAdminTarget('/admin/afiliados?status=APPROVED&page=2')).toBe(
      '/admin/afiliados?status=APPROVED&page=2',
    );
  });

  it('falls back to the dashboard when there is no destination', () => {
    expect(safeAdminTarget(null)).toBe('/admin');
  });

  it('refuses an absolute url to another origin', () => {
    expect(safeAdminTarget('https://exemplo-malicioso.test/colher-senha')).toBe('/admin');
  });

  it('refuses a protocol relative url', () => {
    expect(safeAdminTarget('//exemplo-malicioso.test')).toBe('/admin');
  });

  it('refuses a backslash that some browsers normalise into a slash', () => {
    expect(safeAdminTarget('/\\exemplo-malicioso.test')).toBe('/admin');
  });

  it('refuses a path outside the panel', () => {
    expect(safeAdminTarget('/cadastro')).toBe('/admin');
  });

  it('refuses a path that only looks like the panel', () => {
    expect(safeAdminTarget('/administrador/tudo')).toBe('/admin');
  });

  it('does not send the person back to the login page', () => {
    expect(safeAdminTarget('/admin/login')).toBe('/admin');
  });
});
