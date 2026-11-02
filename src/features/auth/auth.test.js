import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginForm, SignupForm, GoogleAuthButton } from './index';
import { SettingsProvider } from '../../contexts/SettingsContext';

const renderAuth = (ui) =>
  render(
    <BrowserRouter>
      <SettingsProvider>{ui}</SettingsProvider>
    </BrowserRouter>
  );

describe('Auth Feature', () => {
  test('renders LoginForm properly', () => {
    renderAuth(<LoginForm />);
    expect(screen.getByPlaceholderText(/username|اسم المستخدم| utilisateur|Benutzername|пользователь|ユーザー名/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password|كلمة السر|Mot de passe|Passwort|Contraseña|Senha|Şifre|パスワード|пароль/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
  });

  test('renders SignupForm properly', () => {
    renderAuth(<SignupForm />);
    expect(screen.getByLabelText(/full name|الاسم الكامل|Nom complet|Vollständiger Name|Nombre completo|Nome completo|Ad soyad|氏名|Полное имя|姓名/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password|تأكيد|Confirmer|Passwort bestätigen|Confirmar|Şifreyi onayla|确认|パスワード確認|Подтвердите/i)).toBeInTheDocument();
  });

  test('renders GoogleAuthButton properly', () => {
    renderAuth(<GoogleAuthButton text="Sign in with Google" />);
    expect(screen.getByText(/sign in with google/i)).toBeInTheDocument();
  });
});
