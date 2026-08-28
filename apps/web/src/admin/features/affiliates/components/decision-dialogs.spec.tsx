import { render, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { RejectDialog } from './decision-dialogs';

jest.mock('../decide.action', () => ({ approveAffiliate: jest.fn(), rejectAffiliate: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

beforeEach(() => {
  (useRouter as jest.Mock).mockReturnValue({ refresh: jest.fn() });
});

describe('RejectDialog', () => {
  it('opens with the cursor already in the reason', async () => {
    render(
      <RejectDialog
        publicId="10000000-0000-4000-8000-000000000001"
        name="Marina Ferraz"
        open
        onOpenChange={jest.fn()}
      />,
    );

    expect(await screen.findByLabelText('Motivo da reprovação')).toHaveFocus();
  });
});
