const API_key = "11a041bced7b39a14eb4";
const API_secret = "43244a80a4e1995a2724e777d76624610d929555062c680194943b418caa73e7";

export async function getCid(data: any): Promise<string> {
    console.log("📄 Starting IPFS upload to Pinata with data:", data);
    
    const pinataUrl = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
    const pinataHeaders = {
      "Content-Type": "application/json",
      pinata_api_key: API_key,
      pinata_secret_api_key: API_secret,
    };
    const pinataBody = {
        pinataContent: data,      
    };

    try {
      console.log("📤 Sending request to Pinata API...");
      const response = await fetch(pinataUrl, {
        method: "POST",
        headers: pinataHeaders,
        body: JSON.stringify(pinataBody),
      });
      
      if (!response.ok) {
        console.error("❌ Pinata API error:", response.status, response.statusText);
        throw new Error(`Pinata API error: ${response.statusText}`);
      }
      
      const responseData = await response.json();
      console.log("✅ Data uploaded to IPFS successfully:", responseData);
      console.log("🔗 IPFS Hash (CID):", responseData.IpfsHash);
      
      return responseData.IpfsHash; // Return the CID
    } catch (error) {
      console.error("❌ Error uploading to Pinata:", error);
      throw error;
    }
}

// Function to retrieve data from IPFS using CID
export async function getDataFromCid(cid: string): Promise<any> {
    console.log("📥 Fetching data from IPFS with CID:", cid);
    
    try {
      const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
      console.log("🔗 IPFS Gateway URL:", ipfsUrl);
      
      const response = await fetch(ipfsUrl);
      
      if (!response.ok) {
        console.error("❌ IPFS Gateway error:", response.status, response.statusText);
        throw new Error(`IPFS Gateway error: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("✅ Data retrieved from IPFS successfully:", data);
      
      return data;
    } catch (error) {
      console.error("❌ Error retrieving from IPFS:", error);
      throw error;
    }
}
