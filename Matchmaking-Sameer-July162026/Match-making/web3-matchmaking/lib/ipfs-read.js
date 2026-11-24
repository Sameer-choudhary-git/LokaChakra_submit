// Client-safe: only does HTTP fetch, no Node built-ins
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";

export async function getUserDataFromHash(cid) {
  const response = await fetch(`${PINATA_GATEWAY}/${cid}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch data from IPFS: ${response.status}`);
  }
  return response.json();
}