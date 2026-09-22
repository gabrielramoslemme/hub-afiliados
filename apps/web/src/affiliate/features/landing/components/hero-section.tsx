import { ArrowRight, Check, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Container } from '@/affiliate/shared/components/section';
import { hero } from '@/affiliate/shared/content';
import { Button } from '@/shared/components/ui/button';
import { CouponCard } from './coupon-card';
import { EarningsCard } from './earnings-card';
import { Tilt } from './tilt';

/**
 * A faixa escura da página é o topo, e não uma seção do meio: a marca se
 * apresenta uma vez, com força, e o resto do documento fica claro para ser lido.
 */
export function HeroSection() {
  return (
    <section className="surface-brand surface-mesh surface-grid relative isolate overflow-hidden">
      {/*
        Três blocos, e não dois: no celular a promessa vem primeiro e a ação logo
        abaixo, ainda na primeira dobra; os dois objetos que a pessoa recebe
        entram depois, como prova. Com os cartões no meio, o botão de cadastro
        caía abaixo de quase uma tela inteira de rolagem.

        A partir de `lg` a grade recompõe as duas colunas de sempre: promessa e
        ação uma sobre a outra à esquerda, os cartões ocupando as duas linhas à
        direita.
      */}
      <Container className="relative flex flex-col gap-10 pb-24 pt-12 lg:grid lg:grid-cols-12 lg:gap-x-10 lg:gap-y-8 lg:pb-32 lg:pt-20">
        <div className="animate-rise lg:col-span-6 lg:self-end">
          <p className="inline-flex items-center gap-2 rounded-pill border border-white/20 bg-white/10 px-3 py-1.5 text-eyebrow uppercase text-white">
            <Sparkles className="size-3.5 animate-sparkle text-cyan-300" aria-hidden />
            {hero.badge}
          </p>

          <h1 className="text-display mt-7 max-w-[15ch] text-balance text-white">
            {hero.title} <span className="text-cyan-300">{hero.titleAccent}</span>
          </h1>

          <p className="text-lead mt-7 max-w-[52ch] text-blue-200">{hero.lead}</p>

          <p className="mt-4 max-w-[52ch] font-semibold text-white">{hero.kicker}</p>
        </div>

        {/*
          Os dois objetos que a pessoa vai receber, na ordem em que ela os
          recebe: o cupom primeiro, o extrato depois. A deriva é do grupo inteiro
          e a inclinação é de cada cartão — separadas, porque as duas escrevem
          `transform` e uma sobrescreveria a outra no mesmo elemento.
        */}
        <div className="animate-float order-last flex justify-center lg:order-none lg:col-span-6 lg:row-span-2 lg:self-center lg:justify-end">
          <div className="flex w-full max-w-sm flex-col gap-5">
            <Tilt>
              <CouponCard />
            </Tilt>
            <Tilt>
              <EarningsCard />
            </Tilt>
          </div>
        </div>

        <div className="animate-rise lg:col-span-6 lg:col-start-1 lg:self-start">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="inverse" className="group">
              <Link href="#cadastro">
                {hero.primaryCta}
                <ArrowRight className="transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="inverse-outline">
              <Link href="#como-funciona">{hero.secondaryCta}</Link>
            </Button>
          </div>

          <ul className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-blue-200">
            {hero.assurances.map((assurance) => (
              <li key={assurance} className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-cyan-300" aria-hidden />
                {assurance}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
