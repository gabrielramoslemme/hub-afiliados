import { AffiliateStatusEnum } from '@porto/contracts';

export default function HomePage(): JSX.Element {
  return (
    <main style={{ padding: 32 }}>
      <h1>Hub de Afiliados</h1>
      <p>Status possíveis: {Object.values(AffiliateStatusEnum).join(', ')}</p>
    </main>
  );
}
