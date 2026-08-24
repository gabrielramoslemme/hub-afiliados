import Link from 'next/link';
import { footer, site } from '@/core/content/landing';
import { PortoLogo } from './porto-logo';
import { Container } from './section';

export function SiteFooter() {
  return (
    <footer className="surface-brand py-14 text-blue-200">
      <Container className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <PortoLogo tone="dark" />
          <p className="mt-4 text-sm leading-relaxed">{footer.tagline}</p>
        </div>

        <div className="flex flex-col gap-8 sm:flex-row sm:gap-16">
          <nav aria-label="Documentos do programa">
            <h2 className="text-eyebrow uppercase text-blue-400">Programa</h2>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm">
              {footer.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-eyebrow uppercase text-blue-400">Contato</h2>
            <p className="mt-4 text-sm">
              <a
                href={`mailto:${site.contactEmail}`}
                className="transition-colors hover:text-white"
              >
                {site.contactEmail}
              </a>
            </p>
          </div>
        </div>
      </Container>

      <Container className="mt-12 border-t border-blue-800 pt-6">
        <p className="text-[0.8125rem] text-blue-400">
          © {new Date().getFullYear()} {site.company}. Todos os direitos reservados.
        </p>
      </Container>
    </footer>
  );
}
