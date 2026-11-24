"use client";
import { useEffect, useState } from 'react';

// React component example
import { PlaidLink } from 'react-plaid-link';

export default function PlaidKYCComponent() {
  const [linkToken, setLinkToken] = useState(null);

  // Get link token from your backend
  useEffect(() => {
    fetch('/api/create-link-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: ['identity_verification'] })
    })
    .then(res => res.json())
    .then(data => setLinkToken(data.link_token));
  }, []);

  const onSuccess = (public_token, metadata) => {
    // Send public_token to your backend
    fetch('/api/exchange-public-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        public_token,
        identity_verification_id: metadata.identity_verification?.identity_verification_id
      })
    });
  };

  return (
    <PlaidLink
      token={linkToken}
      onSuccess={onSuccess}
      onExit={(err, metadata) => console.log('Exit:', err, metadata)}
    >
      Start Identity Verification
    </PlaidLink>
  );
};