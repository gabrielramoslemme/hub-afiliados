import { render, screen } from '@testing-library/react';
import { currentCampaign } from '../mock-data';
import { CampaignDetailDialog } from './campaign-detail-dialog';

describe('CampaignDetailDialog', () => {
  it('shows the campaign rules and numbers without leaving the listing', () => {
    render(<CampaignDetailDialog campaign={currentCampaign} open onOpenChange={jest.fn()} />);

    const dialog = screen.getByRole('dialog');

    expect(dialog).toHaveTextContent(currentCampaign.name);
    expect(dialog).toHaveTextContent('01/08/2026 até 31/10/2026');
    expect(dialog).toHaveTextContent(currentCampaign.category);
    expect(dialog).toHaveTextContent('R$ 190.000,00');
    expect(dialog).toHaveTextContent('3.000');
    expect(dialog).toHaveTextContent('5% de bônus');
  });
});
