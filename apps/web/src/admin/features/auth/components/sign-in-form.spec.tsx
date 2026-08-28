import { render, screen } from '@testing-library/react';
import { SignInForm } from './sign-in-form';

jest.mock('../sign-in.action', () => ({ signIn: jest.fn() }));

describe('SignInForm', () => {
  it('opens with the cursor already in the first field', () => {
    render(<SignInForm />);

    expect(screen.getByLabelText('E-mail')).toHaveFocus();
  });
});
