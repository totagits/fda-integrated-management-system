import React from 'react';
import { LandingPage } from './components/public/LandingPage';
import { InvitationActivation, SecurePortal } from './components/secure/SecurePortal';
import { SealedBidPortal } from './components/public/SealedBidPortal';
import { BidderPortal } from './components/public/BidderPortal';

export function App() {
  const path = window.location.pathname;
  return path === '/sealed-bid' ? <SealedBidPortal /> : path === '/bidder' || path === '/bidder/verify' ? <BidderPortal /> : path === '/secure/activate' ? <InvitationActivation /> : path === '/secure' || path.startsWith('/secure/') ? <SecurePortal /> : <LandingPage />;
}

export default App;
