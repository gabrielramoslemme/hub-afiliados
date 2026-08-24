import {
  AudienceSection,
  BenefitsSection,
  FaqSection,
  HeroSection,
  PitchSection,
  RequirementsSection,
  StepsSection,
} from '@/affiliate/features/landing';
import { RegistrationSection } from '@/affiliate/features/registration';

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
