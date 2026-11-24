# VCA (Verifiable Credential API)

A simple Express.js API server to receive and process verifiable credential data.

## Features

- **POST /api/credentials**: Endpoint to receive CredentialSubject, types, and proof (optional)
- **GET /api/health**: Health check endpoint
- **GET /**: Server information and available endpoints
- Input validation for required fields
- CORS support for cross-origin requests
- Comprehensive error handling

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The server will run on `http://localhost:3000` by default.

## API Endpoints

### POST /api/credentials

Receives verifiable credential data with the following structure:

**Required Fields:**
- `credentialSubject`: Object containing the credential subject data
- `types`: Array of credential types

**Optional Fields:**
- `proof`: Object containing cryptographic proof (if available)

**Example Request:**
```json
{
  "credentialSubject": {
    "id": "did:example:123456789abcdefghi",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "degree": {
      "type": "BachelorDegree",
      "name": "Bachelor of Science in Computer Science",
      "university": "Example University"
    }
  },
  "types": ["VerifiableCredential", "UniversityDegreeCredential"],
  "proof": {
    "type": "Ed25519Signature2018",
    "created": "2024-01-15T10:30:00Z",
    "verificationMethod": "did:example:issuer#keys-1",
    "proofPurpose": "assertionMethod",
    "jws": "eyJhbGciOiJFZERTQSIsImNyaXQiOlsiYjY0Il0sImI2NCI6ZmFsc2V9..signature"
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Credential data received successfully",
  "data": {
    "credentialSubject": { ... },
    "types": [ ... ],
    "proof": { ... },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "status": "received"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "CredentialSubject is required"
}
```

### GET /api/health

Returns server health status.

**Response (200):**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET /

Returns server information and available endpoints.

## Testing

Run the test script to see the endpoint in action:

```bash
# Make sure the server is running first
npm start

# In another terminal, run the test
node test-endpoint.js
```

The test script will:
1. Send a credential with proof
2. Send a credential without proof
3. Test validation with missing required fields
4. Check server health

## Usage Examples

### Using curl

```bash
# Send credential with proof
curl -X POST http://localhost:3000/api/credentials \
  -H "Content-Type: application/json" \
  -d '{
    "credentialSubject": {
      "id": "did:example:123",
      "name": "John Doe"
    },
    "types": ["VerifiableCredential"],
    "proof": {
      "type": "Ed25519Signature2018",
      "jws": "signature_here"
    }
  }'

# Send credential without proof
curl -X POST http://localhost:3000/api/credentials \
  -H "Content-Type: application/json" \
  -d '{
    "credentialSubject": {
      "id": "did:example:456",
      "name": "Jane Smith"
    },
    "types": ["VerifiableCredential"]
  }'
```

### Using JavaScript/Node.js

```javascript
const axios = require('axios');

const credentialData = {
  credentialSubject: {
    id: "did:example:123",
    name: "John Doe",
    email: "john@example.com"
  },
  types: ["VerifiableCredential", "PersonalCredential"],
  proof: {
    type: "Ed25519Signature2018",
    jws: "signature_here"
  }
};

axios.post('http://localhost:3000/api/credentials', credentialData)
  .then(response => {
    console.log('Success:', response.data);
  })
  .catch(error => {
    console.error('Error:', error.response.data);
  });
```

## Project Structure

```
VCa/
├── index.js           # Main server file
├── test-endpoint.js   # Test script
├── package.json       # Dependencies and scripts
└── README.md         # This file
```

## Environment Variables

- `PORT`: Server port (default: 3000)

## License

ISC
