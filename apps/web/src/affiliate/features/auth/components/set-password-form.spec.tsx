import { render, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { SetPasswordForm } from './set-password-form';

jest.mock('../set-password.action', () => ({ setPassword: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));

beforeEach(() => {
  (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
});

describe('SetPasswordForm', () => {
  it('opens with the cursor already in the first field', () => {
    render(<SetPasswordForm token="any-token" />);

    expect(screen.getByLabelText('Nova senha')).toHaveFocus();
  });
});
