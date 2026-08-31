import { render, screen, within } from '@testing-library/react';
import { affiliateBase, attention, performance, topAffiliates } from '../mock-data';
import { DashboardScreen } from './dashboard-screen';

/**
 * Os gráficos ficam de fora: o recharts mede o container para desenhar, e o
 * jsdom não tem layout — testar o traço aqui seria testar a ausência dele. O que
 * o teste guarda é o que a tela promete em texto, o que ela oferece como ação e
 * o que ela soma na frente de quem lê.
 */
describe('DashboardScreen', () => {
  it('shows the gross revenue already formatted in reais', () => {
    render(<DashboardScreen />);

    expect(screen.getByText('R$ 20.000.000,00')).toBeInTheDocument();
  });

  it('breaks the affiliate base into the four segments, each with its count', () => {
    render(<DashboardScreen />);

    const composition = screen.getByRole('region', { name: /composição da base/i });

    for (const segment of affiliateBase.segments) {
      expect(within(composition).getByText(`${segment.label} — ${segment.count}`)).toBeVisible();
    }
  });

  it('leads with the review of pending registrations as the action of the page', () => {
    render(<DashboardScreen />);

    const review = screen.getByRole('link', {
      name: `Revisar ${attention.pendingReviews} cadastros aguardando avaliação`,
    });

    expect(review).toHaveAttribute('href', '/admin/afiliados?status=PENDING_APPROVAL');
  });

  it('offers no way into the withdrawals screen that does not exist yet', () => {
    render(<DashboardScreen />);

    const failed = screen.getByText(/saques com falha/i).closest('li');

    expect(failed).not.toBeNull();
    expect(within(failed as HTMLElement).queryByRole('link')).toBeNull();
    expect(within(failed as HTMLElement).getByText('Em breve')).toBeVisible();
  });

  it('measures the performance against the goal instead of only printing it', () => {
    render(<DashboardScreen />);

    const meter = screen.getByRole('progressbar', { name: /performance/i });

    expect(meter).toHaveAttribute('aria-valuenow', String(performance.ratePercent));
    expect(meter).toHaveAttribute('aria-valuemax', '100');
  });

  it('leads every ranked affiliate back to their own record', () => {
    render(<DashboardScreen />);

    const [best] = topAffiliates;

    expect(screen.getByRole('link', { name: best.name })).toHaveAttribute(
      'href',
      `/admin/afiliados?search=${encodeURIComponent(best.name)}`,
    );
  });

  it('closes the ranking with the sum of the rows it just listed', () => {
    render(<DashboardScreen />);

    const footer = screen.getByRole('row', { name: /soma dos 5/i });

    expect(within(footer).getByText('439')).toBeVisible();
    expect(within(footer).getByText('R$ 56.000,00')).toBeVisible();
    expect(within(footer).getByText('R$ 8.400,00')).toBeVisible();
  });
});
