const fs = require('fs');
const path = require('path');

const PINATA_JWT = process.env.PINATA_JWT;

async function uploadToPinata(filePath) {
  if (!PINATA_JWT) {
    throw new Error('PINATA_JWT is not set');
  }

  const fileName = path.basename(filePath);
  const fileBuffer = fs.readFileSync(filePath);

  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer]), fileName);

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Pinata upload failed: ${response.status} ${message}`);
  }

  return response.json();
}

module.exports = {
  uploadToPinata,
};