import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginForm, SignupForm, GoogleAuthButton } from './index';

describe('Auth Feature', () => {
  test('renders LoginForm properly', () => {
    render(
      <BrowserRouter>
        <LoginForm />
      </BrowserRouter>
    );
    expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter password/i)).toBeInTheDocument();
    expect(screen.getByText(/sign in with google/i)).toBeInTheDocument();
  });

  test('renders SignupForm properly', () => {
    render(
      <BrowserRouter>
        <SignupForm />
      </BrowserRouter>
    );
    expect(screen.getByPlaceholderText(/full name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/confirm password/i)).toBeInTheDocument();
  });

  test('renders GoogleAuthButton properly', () => {
    render(<GoogleAuthButton text="Sign in with Google" />);
    expect(screen.getByText(/sign in with google/i)).toBeInTheDocument();
  });
});
