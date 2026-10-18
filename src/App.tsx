import React from 'react';
import { LandingPage } from './components/public/LandingPage';
import { InvitationActivation, SecurePortal } from './components/secure/SecurePortal';
import { SealedBidPortal } from './components/public/SealedBidPortal';

export function App() {
  const path = window.location.pathname;
  return path === '/sealed-bid' ? <SealedBidPortal /> : path === '/secure/activate' ? <InvitationActivation /> : path === '/secure' || path.startsWith('/secure/') ? <SecurePortal /> : <LandingPage />;
}

export default App;
