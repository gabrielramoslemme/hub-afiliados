/**
 * As seções moram só na landing. Fora dela o `#` sozinho procura a âncora na
 * página atual, onde ela não existe, e o clique não leva a lugar nenhum. O
 * cadastro é a exceção: tem página própria, que abre com o foco no formulário
 * em vez de largar a pessoa no pé da landing.
 */
export function destinationsFor(pathname: string) {
  const onLanding = pathname === '/';

  return {
    section: (href: string) => (onLanding ? href : `/${href}`),
    registration: onLanding ? '#cadastro' : '/cadastro',
  };
}
