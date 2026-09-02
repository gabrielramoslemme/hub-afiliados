import { render, screen, within } from '@testing-library/react';
import { parseCampaignParams } from '../campaign-params';
import { currentCampaign, newParticipantsThisWeek } from '../mock-data';
import { CampaignsScreen } from './campaigns-screen';

/**
 * O que o teste guarda é o que a tela promete em texto, para onde ela leva e o
 * que ela se recusa a prometer — criar e editar campanha dependem de rotas que a
 * Onda 1 não tem, e oferecer o clique seria oferecer um caminho que não chega.
 */
describe('CampaignsScreen', () => {
  it('leads with the campaign that is running right now', () => {
    render(<CampaignsScreen params={parseCampaignParams({})} />);

    const highlight = screen.getByRole('region', { name: /campanha atual/i });

    expect(within(highlight).getByText(currentCampaign.name)).toBeVisible();
    expect(within(highlight).getByText('R$ 190.000,00')).toBeVisible();
    expect(within(highlight).getByText(/R\$ 10\.000,00 pendente/)).toBeVisible();
    expect(within(highlight).getByText('3.000')).toBeVisible();
    expect(within(highlight).getByText(`+${newParticipantsThisWeek} essa semana`)).toBeVisible();
  });

  it('reads each row period as the range it is', () => {
    render(<CampaignsScreen params={parseCampaignParams({ search: 'estofados' })} />);

    const row = screen.getByRole('row', { name: new RegExp(currentCampaign.name) });

    expect(within(row).getByText('01/08/2026 até 31/10/2026')).toBeVisible();
  });

  it('points every cut at its own address, so the listing survives a reload', () => {
    render(<CampaignsScreen params={parseCampaignParams({})} />);

    expect(screen.getByRole('link', { name: 'Encerradas' })).toHaveAttribute(
      'href',
      '/admin/campanhas?status=ended',
    );
    expect(screen.getByRole('link', { name: 'Todas' })).toHaveAttribute('href', '/admin/campanhas');
  });

  it('opens each column in its own natural order, through the url', () => {
    render(<CampaignsScreen params={parseCampaignParams({})} />);

    // Alfabeto começa em A, e período começa pelo mais recente — que é o padrão
    // da listagem e por isso não precisa aparecer no endereço.
    expect(screen.getByRole('link', { name: 'Nome' })).toHaveAttribute(
      'href',
      '/admin/campanhas?sortBy=name&sortOrder=asc',
    );
    expect(screen.getByRole('link', { name: 'Período' })).toHaveAttribute(
      'href',
      '/admin/campanhas?sortOrder=asc',
    );
  });

  it('flips the order when the column already active is clicked again', () => {
    render(<CampaignsScreen params={parseCampaignParams({ sortBy: 'name', sortOrder: 'asc' })} />);

    expect(screen.getByRole('link', { name: 'Nome' })).toHaveAttribute(
      'href',
      '/admin/campanhas?sortBy=name',
    );
  });

  it('offers no way into the creation screen that does not exist yet', () => {
    render(<CampaignsScreen params={parseCampaignParams({})} />);

    expect(screen.queryByRole('link', { name: /nova campanha/i })).toBeNull();

    const create = screen.getByRole('button', { name: /nova campanha/i });

    expect(create).toBeDisabled();
    expect(screen.getAllByText('Em breve').length).toBeGreaterThan(0);
  });

  it('says what was searched when the cut comes back empty', () => {
    render(<CampaignsScreen params={parseCampaignParams({ search: 'submarino' })} />);

    expect(screen.getByText(/nada encontrado para “submarino”/i)).toBeVisible();
    expect(screen.getByRole('link', { name: /limpar filtros/i })).toHaveAttribute(
      'href',
      '/admin/campanhas',
    );
  });
});
