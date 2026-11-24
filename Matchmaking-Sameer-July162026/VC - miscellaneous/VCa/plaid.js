// server.js
const express = require('express');
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const cors = require('cors');

const app = express();
app.use(cors()); // Use for local development to allow requests from frontend
app.use(express.json());

// --- 1. CONFIGURE PLAID CLIENT ---
// Get your Plaid credentials from the Plaid Dashboard (https://dashboard.plaid.com/team/keys)
const PLAID_CLIENT_ID = '687df7d9551e1a0025da2f3c';
const PLAID_SECRET = 'd9a770536b6c2347df4332e4371cca';
const PLAID_ENV = 'sandbox'; 

const configuration = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
      'PLAID-SECRET': PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

// --- 2. CREATE A LINK TOKEN FOR IDENTITY VERIFICATION ---
app.post('/api/create_link_token', async (req, res) => {
  try {
    const createTokenRequest = {
      user: {
        // This is a unique ID for the user in your system
        client_user_id: 'user-id-' + Date.now(),
      },
      client_name: 'My KYC App',
      products: ['identity_verification'], // Specify the product
      language: 'en',
      country_codes: ['US', 'GB', 'CA', 'FR', 'ES', 'DE'], // Optional: Prefill or limit countries
      identity_verification: {
        // The ID of the Identity Verification template to use.
        // You create this in the Plaid Dashboard.
        template_id: 'YOUR_TEMPLATE_ID',
      },
    };

    const createTokenResponse = await plaidClient.linkTokenCreate(createTokenRequest);
    res.json(createTokenResponse.data);
  } catch (error) {
    console.error("Error creating link token:", error.response.data);
    res.status(500).json({ error: 'Failed to create link token' });
  }
});

// --- 3. GET THE IDENTITY VERIFICATION RESULTS (RECOMMENDED: USE WEBHOOKS INSTEAD) ---
// This endpoint is for demonstration. In production, you should use webhooks
// to be notified when the verification status changes.
app.post('/api/get_identity_verification', async (req, res) => {
    const linkToken = req.body.link_token;
    try {
        const response = await plaidClient.identityVerificationGet({
            link_token: linkToken,
        });
        const identityData = response.data;
        console.log('Verification Status:', identityData.status);
        console.log('User Details:', identityData.user);
        res.json(identityData);
    } catch (error) {
        console.error("Error getting verification results:", error.response.data);
        res.status(500).json({ error: 'Failed to get results' });
    }
});


const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});