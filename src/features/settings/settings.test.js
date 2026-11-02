import React from 'react';
import { render, screen } from '@testing-library/react';
import { SettingsProvider } from '../../contexts/SettingsContext';
import { AppearanceSettings, LanguageSettings, NotificationsSettings } from './index';

describe('Settings Feature Panels', () => {
  test('renders AppearanceSettings panel', () => {
    render(
      <SettingsProvider>
        <AppearanceSettings />
      </SettingsProvider>
    );
    expect(screen.getByText(/personalize how bayan looks and feels/i)).toBeInTheDocument();
    expect(screen.getByText(/color theme/i)).toBeInTheDocument();
  });

  test('renders LanguageSettings panel', () => {
    render(
      <SettingsProvider>
        <LanguageSettings />
      </SettingsProvider>
    );
    expect(screen.getByText(/choose the interface language/i)).toBeInTheDocument();
  });

  test('renders NotificationsSettings panel', () => {
    render(
      <SettingsProvider>
        <NotificationsSettings />
      </SettingsProvider>
    );
    expect(screen.getByText(/choose what activity you want to be notified about/i)).toBeInTheDocument();
  });

  test('does not throw or produce unhandled errors when unauthenticated', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('Token');
    expect(() => {
      render(
        <SettingsProvider>
          <AppearanceSettings />
        </SettingsProvider>
      );
    }).not.toThrow();
  });
});
