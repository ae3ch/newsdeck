import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { attachManifest, registerServiceWorker } from './lib/install';
import './index.css';

attachManifest();
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
