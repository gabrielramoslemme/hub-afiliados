import { cn } from '@/shared/lib/cn';

/**
 * Assinatura da marca: o logotipo oficial mais o nome do programa.
 *
 * O SVG vem de `public/porto-logo.svg` por `<img>`, e não inline nem por
 * `next/image`. Inline duplicaria os traçados do arquivo — na próxima revisão da
 * marca alguém trocaria o `.svg` e o componente ficaria para trás. E o
 * otimizador do Next não tem o que otimizar num SVG: ele o repassa como está,
 * cobrando configuração em troca de nada.
 *
 * O logotipo é monocromático no ciano da marca, que é exatamente o
 * `--color-cyan-500`. Ele funciona sobre branco e sobre a faixa escura sem
 * variante, porque ciano sobre o azul da marca é o par que a própria identidade
 * usa — só o nome do programa ao lado muda de tom.
 */
export function PortoLogo({
  className,
  tone = 'light',
}: {
  className?: string;
  tone?: 'light' | 'dark';
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {/* biome-ignore lint/performance/noImgElement: SVG estático não passa pelo otimizador do Next */}
      <img
        src="/porto-logo.svg"
        alt="Porto"
        width={140}
        height={32}
        className="h-6 w-auto"
        /* O logotipo tem tamanho fixo e abre acima da dobra: sem `eager` ele
           pisca no primeiro paint de toda navegação. */
        loading="eager"
        decoding="async"
      />
      <span
        className={cn(
          'border-l pl-2.5 text-[0.8125rem] font-medium leading-tight',
          tone === 'dark' ? 'border-blue-700 text-blue-200' : 'border-ink-200 text-ink-500',
        )}
      >
        Hub de Afiliados
      </span>
    </span>
  );
}
