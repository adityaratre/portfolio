import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import App from './App';
import AdminApp from './AdminApp';
import { ADMIN_PATH, loadPublicPortfolioContent } from './lib/portfolioApi';
import { applyPortfolioSeo } from './lib/siteSeo';
import { setPortfolioData } from './data/portfolio';
import './index.css';

async function start() {
  const mount = document.getElementById('root');
  if (!mount) throw new Error('Missing application mount point.');
  const root = createRoot(mount);

  if (window.location.pathname.replace(/\/$/, '') === ADMIN_PATH) {
    root.render(<StrictMode><AdminApp /></StrictMode>);
    return;
  }

  try {
    const remoteContent = await loadPublicPortfolioContent();
    if (remoteContent) setPortfolioData(remoteContent);
  } catch (error) {
    // The static portfolio remains available if the CMS is temporarily offline.
    console.warn('Portfolio CMS unavailable; using the bundled content.', error);
  }

  applyPortfolioSeo();
  root.render(
    <StrictMode>
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </StrictMode>,
  );
}

void start();
