import { AudienceSection } from '@/features/landing/audience-section';
import { BenefitsSection } from '@/features/landing/benefits-section';
import { FaqSection } from '@/features/landing/faq-section';
import { HeroSection } from '@/features/landing/hero-section';
import { PitchSection } from '@/features/landing/pitch-section';
import { RequirementsSection } from '@/features/landing/requirements-section';
import { StepsSection } from '@/features/landing/steps-section';
import { RegistrationSection } from '@/features/registration/registration-section';

/*
  Página estática: nada aqui consulta a API, então ela é gerada uma vez no build
  e servida do cache. O formulário é a única ilha de cliente da rota.
*/
export const dynamic = 'force-static';

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <AudienceSection />
      <StepsSection />
      <BenefitsSection />
      <PitchSection />
      <RequirementsSection />
      <FaqSection />
      <RegistrationSection />
    </>
  );
}
