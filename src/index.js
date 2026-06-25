import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { HelmetProvider } from 'react-helmet-async';

import { SettingsProvider } from './context/SettingsContext'; // <-- مهم

const root = ReactDOM.createRoot(
  document.getElementById('root')
);

root.render(
  <React.StrictMode>
    <SettingsProvider>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </SettingsProvider>
  </React.StrictMode>
);

reportWebVitals();