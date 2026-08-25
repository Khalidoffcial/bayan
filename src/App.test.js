import React from 'react';
import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { SettingsProvider } from './contexts/SettingsContext';
import App from './App';

test('renders App without crashing', () => {
  const { container } = render(
    <SettingsProvider>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </SettingsProvider>
  );
  expect(container).toBeDefined();
});

