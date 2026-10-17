import React from 'react';
import { LandingPage } from './components/public/LandingPage';
import { SecurePortal } from './components/secure/SecurePortal';

export function App() {
  const path = window.location.pathname;
  return path === '/secure' || path.startsWith('/secure/') ? <SecurePortal /> : <LandingPage />;
}

export default App;
