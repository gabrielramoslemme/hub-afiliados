import { isPanelIconPath, isPanelPasswordPath } from './routes';

describe('isPanelIconPath', () => {
  it.each([
    ['/admin/icon-1iolj1.svg', 'o nome que o Next serve, em dev e no build'],
    ['/admin/icon.svg', 'o mesmo sem o hash, que é nome interno e não contrato'],
  ])('deixa passar %s — %s', (pathname) => {
    expect(isPanelIconPath(pathname)).toBe(true);
  });

  /*
    A exceção existe para um arquivo e nada mais: ela abre um caminho dentro da
    área logada, então o que ela NÃO casa importa tanto quanto o que casa.
  */
  it.each([
    ['/admin', 'a home do painel'],
    ['/admin/afiliados', 'a fila'],
    ['/admin/icon-1iolj1.svg/afiliados', 'caminho pendurado no nome do ícone'],
    ['/admin/afiliados/icon-1iolj1.svg', 'ícone fora da raiz do segmento'],
    ['/admin/iconografia.svg', 'nome que só começa igual'],
    ['/admin/icon-1iolj1.json', 'outra extensão'],
  ])('barra %s — %s', (pathname) => {
    expect(isPanelIconPath(pathname)).toBe(false);
  });
});

describe('isPanelPasswordPath', () => {
  it.each([
    ['/admin/esqueci-senha', 'o pedido de recuperação'],
    ['/admin/redefinir-senha', 'a tela que o link do e-mail abre'],
  ])('deixa passar %s — %s', (pathname) => {
    expect(isPanelPasswordPath(pathname)).toBe(true);
  });

  /*
    Mesma razão da exceção do ícone: isto abre caminho dentro da área logada, e
    o que ele não casa importa tanto quanto o que casa.
  */
  it.each([
    ['/admin', 'a home do painel'],
    ['/admin/afiliados', 'a fila'],
    ['/admin/esqueci-senha/afiliados', 'caminho pendurado no nome da tela'],
    ['/admin/redefinir-senhas', 'nome que só começa igual'],
  ])('barra %s — %s', (pathname) => {
    expect(isPanelPasswordPath(pathname)).toBe(false);
  });
});
