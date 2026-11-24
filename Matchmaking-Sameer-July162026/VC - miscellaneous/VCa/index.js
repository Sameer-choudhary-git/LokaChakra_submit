const express = require('express');
const cors = require('cors');
const Arweave = require('arweave');
const CryptoJS = require('crypto-js');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3002;
// alllow all orign request
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const Arweave_BASE_URL = 'https://arweave.net';
const Arweave_LOCAL_URL = 'http://localhost:1984';


const wallet = {
  "kty": "RSA",
  "e": "AQAB",
  "n": "vH1eTCCqB78ONt4T4RkMhTbr0uOdOS125y4YX5zs31s3UxiIm6DP7BZWo2BZnOb9JR7YLLm2GQbKAooofr14Y8yGwo-GR44jwIvO1qLiD6P-yQrrsV__uYO7MZNqJzEQ68v0GfwCgRs2SCmawlDhWue9eM3Meg-HUeH-Wk65qRKpDnzwCmuKmvs8qvOyWMATl-4oRlYkrIzFxSXiGUfT9CRVJIAXjjUAjt6gAlIf1fTcjDW529eacA4AEqGT8PBVPCsRE39-_zuh72zAcfHrYRic1I2kV1QY71EaQQI-RhyqgM4PcX4KxNMmakfK9UEKXPs0Ws2JLLNQu-bdOIYoFiwJq1e4HGA-ZZ6JJIzQ7I3xrymGeysytiGyxmggT4ZNvvgsC5Xc_gbbAttsYZt0sB2KytwtdoO9fR0E_LP0ZF5np0gbBPjpqB-blEckflDsjVnkSyx0GYGKMtf60q-1oLR16AG6kmSpJ8RS8OuAN5cA1TMacsIirrSw9_46MaqR8Xf5yalLW0i8k92iwCarlKTMkYWXcBIUz4aKPew41Pr2tY11aPcXpvX2eDLsM4dJ-jlY7e0PRl4iazykdjtJ_-hpl2u0KIePkqG2_FdBuov_SVlw8eohmXjxSCxsABxoEioqKV5bKNpVNSIBsDiB3eRmi01nwkxocr8wVGAdWpU",
  "d": "RU2xPLtr2QJJ9ymLVKHxpQ9vAPDYr5vEUrbzlkAsJemze1WTcOldWbhS7aow-MxDeoEPSc6UojoJT4q93e_LUqJyUBoWbLvZ8GNXTzq_dLG_LetagrLB41OIoe9KQhO73X71hxJOV2sKd9j4QocbfOGlHERK8PxBrH00GL9Ga2BlkWKlnacx5M8IXPDSe-hPq_aQj2AABwORee32ZoYu697qAUwpnQtm46D-YywP8YqhBtqANlFdQuMa6r7HFvk-1aseEbW4m56w6UfqsFqbSW2TyGE18jgFHQUMaqeo_v1uQYLCUd_elMTwJHa2LJvX9B0XAGX_EFT0E8qMP0qwdOjWg4qrjniGUanmN9liUeIaZfZr7dqPG081iJeZ6lyDMwfL-dvlD8mAus4YdoRaHUK0JYFLfLzNo_-ClPVTek34TvvcZRbOhoe2RmbcvLI9OCgRSJ5ipYjyn5NPLfHwfNNopQDZcLoS6YcevyeM3XGr1se8fQKF8Y_MGrTixxqhO-q8SW_XJCXTlW0Ow3Fsj7ChfynN8hOdcutl7Erp102yj0KyLdUz-Znv5J44NHJRJiOkT5_dcmTIZTqtZzlQN26QUNi-8dgKx1yy38vzHCHME_rMnCKyiD8fHWSol0EAMeAqhIDNCCQ7R69j-vWs53wfUAg59Qe1vg8z0zLwd1c",
  "p": "5X9w-Y7CZYdJKpKOxRx1r-FX6d3CZ0UiudkroXjf0blN1LPxc5peZ-9ikm3mDVOLoNRHpoKnvw8KsjJDoy1KzTJ3RkHS2L8fbtiPogkbns3CrCFBxkQfqUITcOVMDjRRzr9znn1Sch9h3zvkSm-OvHbtowBdVK5XvixWJmQTUKgoY5twK3gVsPtSutcFOfH8itoJmMa-TTbksUT2NtdkvT1JWaz5Bqq_m8pnIb3pgwlcWD2M0lOJ9DSSaebF0wCzFWX-dfPSJCvEnz4jZfw0ZWLfEkgNJIKLhS6fDd6QbonbmnfISH8pm7fBZ7dIIQ8rfjPU3_lWSY68UrtyvN2eHw",
  "q": "0kGesXEOa8RXXaNkQApmC5RDVKc0dG3vjfBEgLYQ4HTEJL0XpNWxuSqtDTnoEJsppv9LhP8Pge61QD3SwrKcNeISURlcE9X5b0ML0I1ZF4xLOxZsD97MmLC95DcvaDCKx8JA41wAAHAptOApwGZ0DryIksgV36bbDaOs4wYJuc6Ewzh9QtBQLg4FOdkIBqnORVVnqYhXXSZ5JHwF9sUFDOSNEJNprtMWQgYiHgsBVoM8Eni-vJq5gXVD18EKwEpaxUI7YNUTDyFIrIxhLjjgFr9JCtCT0yeJIUOlVZWvydYLbJtl2MrjRjTpzOsBUFiWOWYoTh9nUEZfGcbjgpAIyw",
  "dp": "0yQvxXnhQdV4rDFQJurrH5h78I7011wU-dVivdleWi5Y-_NdlhUU_BySnNN9Tw9pK9uB3CDiwfXNympSLiNyaV0fvUS7_mvAOJQHeXVVswHtM74ZLJbqZieDiV98XKkoBsW_UrZMDvDuc5o_i3gdYykrssaYF1ubIDzcOc_isVc0aYfNaEC__CcNUxaWGVyYEwtMvwFCffmd57XhrEz4wt5KyLVKGycmx-csgS-fUc5f5lMiZzMyfbmMZuBJarp_CJXgyZY75MlbyYI6wQ6LCigvwTsG1GtCf5KIBROZ4Aj3QKMpYgGUP06NIqXON5QkWKTJGhLknyIyAw-wHTDr0w",
  "dq": "YxD2E8cgM1jEjWMyFhaQND58ZwONbJpr9-XQcRDX7No3nNPXsxvY7FUWSpgRJtnlC0FYtOZ0yRTPI-C9UG1VuvG1Da80Okhkia7-fxpKcxTwUXvkGKoynnMQVdpGpQHSMgLuDfJIMeynSgkgwv3DCzp74yURYVq99bQ7_o_Wv0x2M4GHS5bZYInMnpAK_xC9FuABwthxyXsaMz2YlcgI9CUv7jJ25h-haiR3qM4oqDmXcWChBj6kz0GQYLUdOrMOB8mILrzWiRd2pY5TL7MuqqkgYk8ah7AmJZ045pVryV7n7RlfKIGYCnld--ZyrQfAaHUg4oZbaHBv2LZkdh0ldw",
  "qi": "WpPCaWtr32e37KPgQfcqGfcJV0-KkhCH5J9hsXRLA-9FqTT4i2TarTpDTnUnvu4xYhPjPysPxmI9_bOor686s-R5K6-XgsfIO_oqk8GiQlf9atpgyWZYK9lBj1gpG8ZaculjF2BL2wmW3wrpCb-PGdUoFCy6RRAFpErcYpK0nN-1aLYbfqs4N49dj_Sclolm6KscGMOrqVnKtMP4AQdW3qLRWfVR6L1-eqYNzyBL6ZRdPSkZbY2I95kZVgCEl22Snh7OC4t848EV_1yb-DwjBbr2m3o_2krLbVcbxKkG4WJhbpVAm0IHwDsELMRXCoQrkUJc1eFJFF6OM89MOifWzQ"
}

const NETWORK_CONFIG = {
  local: {
    host: 'localhost',
    port: 1984,
    protocol: 'http'
  },
  mainnet: {
    host: 'arweave.net',
    port: 443,
    protocol: 'https'
  },
  testnet: {
    host: 'testnet.arweave.dev',
    port: 443,
    protocol: 'https'
  }
};

const CURRENT_NETWORK = 'local';

const arweave = Arweave.init(NETWORK_CONFIG[CURRENT_NETWORK]);

async function mintToken() {
  const address = await arweave.wallets.jwkToAddress(wallet);
  const success = await arweave.api.get(`/mint/${address}/10000000000000`);
  if (success) {
    const balance = await arweave.wallets.getBalance(address);
    const arBalance = arweave.ar.winstonToAr(balance);
    console.log(`Test tokens minted successfully for address ${address}. Balance: ${arBalance} AR`);
  } else {
    console.error(`Failed to mint test tokens for address ${address}`);
    res.status(500).json({
      success: false,
      error: 'Failed to mint test tokens'
    });
  }
}
mintToken().catch(error => {
  console.error('Error minting test tokens:', error);
  process.exit(1);
});

app.post('/api/upload', async (req, res) => {
  const {vc} = req.body;
  console.log('Received data to upload endpoint:', req.body);
  const arweaveResult = await uploadToArweave(vc);
  res.status(200).json({
    success: true,
    message: 'Credential data uploaded to Arweave successfully',
    data: arweaveResult,
    blockchain: {
      platform: 'Arweave',
      transactionId: arweaveResult.transactionId,
      url: arweaveResult.url,
      status: arweaveResult.status,
      encrypted: arweaveResult.encrypted,
      dataSize: arweaveResult.dataSize,
      confirmations: arweaveResult.confirmations
    }
  });

})

app.post('/api/getData', async (req, res) => {
  const { transactionId } = req.body;
  try {
      const response = await fetch(`http://localhost:1984/${transactionId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.text(); // or .json() if it's JSON
      console.log("Fetched data:", data);
      res.status(200).json({
        success: true,
        data: data
      });
    } catch (error) {
      console.error("Fetch error:", error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch data',
        details: error.message
      });
    }
});



async function uploadToArweave(encryptedVcData) {
  console.log('Starting upload to Arweave... :' , encryptedVcData);

  if (!wallet) {
    throw new Error('Arweave wallet is required for signing');
  }

  try {
    console.log('Uploading Verifiable Credential to Arweave...');
    const vcString = JSON.stringify(encryptedVcData);
    console.log('VC String:', vcString);

    const transaction = await arweave.createTransaction({
      data: vcString
    }, wallet);
    transaction.addTag('Content-Type', 'application/json');
    transaction.addTag('App-Name', 'VCA-System');
    transaction.addTag('Type', 'Encrypted-VC');
    transaction.addTag('Timestamp', new Date().toISOString());
    transaction.addTag('Encrypted', 'true');

    await arweave.transactions.sign(transaction, wallet);
    const response = await arweave.transactions.post(transaction);
    console.log('Transaction submitted to Arweave:', response);

    if (response.status === 200) {
      console.log('✅ Transaction successfully submitted to Arweave');

      const walletAddress = await arweave.wallets.jwkToAddress(wallet);

      return {
        transactionId: transaction.id,
        status: 'submitted',
        url: `${Arweave_LOCAL_URL}/${transaction.id}`,
        dataSize: transaction.data_size,
        encrypted: true,
        confirmations: 0,
        networkResponse: response.status
      };
    } else {
      throw new Error(`Arweave submission failed with status: ${response.status}`);
    }

  } catch (error) {
    console.error('Error uploading to Arweave:', error);
    throw new Error(`Failed to upload VC to Arweave: ${error.message}`);
  }
}

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    arweave: {
      host: arweave.api.config.host,
      port: arweave.api.config.port,
      protocol: arweave.api.config.protocol
    }
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'VCA Server is running',
    endpoints: {
      'GET /api/health': 'Health check'
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Access the server at http:/localhost:${PORT}`);
});

module.exports = app;