  import { NextResponse } from 'next/server';

  // This is a secure, server-side-only endpoint.
  // The client will call this endpoint to upload data to IPFS.

  export async function POST(request: Request) {
    try {
      console.log("Received request to upload to IPFS");
      const body = await request.json();
      const userProfileData = body.user;

      if (!userProfileData) {
        return NextResponse.json({ error: 'User data is required' }, { status: 400 });
      }

      // Securely get API keys from environment variables on the server
      const pinataApiKey = process.env.PINATA_API_KEY;
      const pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;

      if (!pinataApiKey || !pinataSecretApiKey) {
        console.error("Pinata API keys are not set in environment variables.");
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }

      const pinataUrl = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
      const pinataHeaders = {
        "Content-Type": "application/json",
        "pinata_api_key": pinataApiKey,
        "pinata_secret_api_key": pinataSecretApiKey,
      };

      const pinataBody = {
        // Pinata requires the content to be under a `pinataContent` key
        pinataContent: {
          user: userProfileData,
        },
        // Optional: Add metadata for easier management in Pinata
        pinataMetadata: {
          name: `Profile for ${userProfileData.wallet || 'unknown'}`,
          keyvalues: {
            role: userProfileData.role || 'unknown'
          }
        }
      };

      const response = await fetch(pinataUrl, {
        method: "POST",
        headers: pinataHeaders,
        body: JSON.stringify(pinataBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Pinata API error:", errorText);
        return NextResponse.json({ error: `Pinata API error: ${response.statusText}` }, { status: response.status });
      }

      const data = await response.json();
      
      // Return only the IPFS hash to the client
      return NextResponse.json({ ipfsHash: data.IpfsHash });

    } catch (error) {
      console.error("Error in IPFS upload endpoint:", error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }