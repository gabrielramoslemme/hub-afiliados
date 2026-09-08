import { cn } from '@/shared/lib/cn';

/**
 * A trava da marca: o wordmark da Porto Serviço com o nome do programa embaixo,
 * na composição do kit oficial que mora em `public/brand`.
 *
 * O SVG vem de `public/brand` por `<img>`, e não inline nem por `next/image`.
 * Inline duplicaria os traçados do arquivo — na próxima revisão da marca alguém
 * trocaria o `.svg` e o componente ficaria para trás. E o otimizador do Next não
 * tem o que otimizar num SVG: ele o repassa como está, cobrando configuração em
 * troca de nada.
 *
 * O descritor é texto do documento, e não o `<text>` que vem dentro do arquivo
 * do kit: lá ele é composto em Porto Roobert, fonte que o projeto não serve, e
 * SVG dentro de `<img>` não enxerga a fonte da página — o navegador cairia na
 * serifada padrão. Em Open Sans ele ainda ganha seleção, busca e leitor de tela.
 *
 * São duas variantes porque a trava é bicolor: sobre o azul da marca o "Serviço"
 * preto desaparece. A negativa é o mesmo desenho, inteiro em branco.
 */
export function PortoLogo({
  className,
  tone = 'light',
}: {
  className?: string;
  tone?: 'light' | 'dark';
}) {
  const negative = tone === 'dark';

  return (
    <span className={cn('inline-flex flex-col items-end', className)}>
      {/* biome-ignore lint/performance/noImgElement: SVG estático não passa pelo otimizador do Next */}
      <img
        src={`/brand/porto-servico-wordmark-${negative ? 'negative' : 'primary'}.svg`}
        alt="Porto Serviço"
        width={2927}
        height={490}
        className="h-7 w-auto"
        /* O logotipo tem tamanho fixo e abre acima da dobra: sem `eager` ele
           pisca no primeiro paint de toda navegação. */
        loading="eager"
        decoding="async"
      />
      {/*
        Alinhado à direita e colado na base do wordmark, como no kit. O corpo é
        o do arquivo original arredondado para cima: a proporção desenhada a
        3.000px daria 10px aqui, pequeno demais para ler numa barra de 64px.
      */}
      <span
        className={cn('text-[0.6875rem] leading-none', negative ? 'text-white' : 'text-ink-900')}
      >
        Influenciadores
      </span>
    </span>
  );
}
