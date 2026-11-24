const {
  Connection,
  PublicKey,
} = require("@solana/web3.js");
const fetch = require('node-fetch'); // You'll need to install: npm install node-fetch
const fs = require('fs');
const bs58 = require('bs58'); 

const PROGRAM_ID = new PublicKey("Cb2kAL6pdTpEVhmXiZ7kiJ2jttHXfMoJA4tbZiiCZyjF");
const connection = new Connection("http://127.0.0.1:8899");

// Role offset mapping (after authority(32) + is_active(1) + created_at(8) + updated_at(8) = 49 bytes)
const ROLE_OFFSETS = {
    founder: 49,
    investor: 50,
    accelerator: 51,
    executive: 52,
    legal: 53,
    government: 54,
    cybersecurity: 55,
    freelancer: 56,
    mentor_research: 57,
    exit_planner: 58
};

// IPFS Gateway URLs (you can add more as fallbacks)
const IPFS_GATEWAYS = [
    'https://gateway.pinata.cloud/ipfs/',
    'https://ipfs.io/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://dweb.link/ipfs/'
];

function deserializeString(buffer, offset) {
    const length = buffer.readUInt32LE(offset);
    const stringBytes = buffer.slice(offset + 4, offset + 4 + length);
    const value = stringBytes.toString('utf8');
    
    return {
        value: value,
        nextOffset: offset + 4 + length
    };
}

function extractIpfsFromProfile(buffer) {
    let offset = 0;
    
    try {
        // Skip through the struct to get to IPFS CID at the end
        // Authority (32 bytes)
        offset += 32;
        
        // is_active (1 byte)
        offset += 1;
        
        // created_at (8 bytes)
        offset += 8;
        
        // updated_at (8 bytes)  
        offset += 8;
        
        // Skip all 10 role flags (10 bytes)
        offset += 10;
        
        // Now we're at the IPFS CID string
        const ipfsCid = deserializeString(buffer, offset);
        
        return ipfsCid.value;
        
    } catch (error) {
        console.error("IPFS extraction error:", error);
        throw error;
    }
}

async function fetchFromIpfs(cid, gatewayIndex = 0) {
    if (gatewayIndex >= IPFS_GATEWAYS.length) {
        throw new Error(`Failed to fetch from all ${IPFS_GATEWAYS.length} gateways`);
    }
    
    const gateway = IPFS_GATEWAYS[gatewayIndex];
    const url = `${gateway}${cid}`;
    
    try {
        console.log(`🌐 Trying gateway ${gatewayIndex + 1}: ${gateway}`);
        
        const response = await fetch(url, {
            timeout: 10000, // 10 second timeout
            headers: {
                'User-Agent': 'IPFS-Fetcher/1.0'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type') || '';
        
        // Try to parse as JSON first, then fallback to text
        let data;
        if (contentType.includes('application/json') || cid.includes('json')) {
            try {
                data = await response.json();
            } catch (e) {
                data = await response.text();
            }
        } else {
            data = await response.text();
        }
        
        return {
            success: true,
            data: data,
            contentType: contentType,
            gateway: gateway,
            size: response.headers.get('content-length') || 'unknown'
        };
        
    } catch (error) {
        console.log(`❌ Gateway ${gatewayIndex + 1} failed: ${error.message}`);
        
        // Try next gateway
        return await fetchFromIpfs(cid, gatewayIndex + 1);
    }
}

function createRoleFilter(role) {
    if (!ROLE_OFFSETS[role]) {
        throw new Error(`Invalid role: ${role}. Valid roles: ${Object.keys(ROLE_OFFSETS).join(', ')}`);
    }
    
    // Using native base58 encoding from web3.js
    const { encode } = require("@solana/web3.js").PublicKey.prototype.constructor;
    
    return {
        memcmp: {
            offset: ROLE_OFFSETS[role],
            bytes: "2" // base58 encoding of [1] is simply "2"
        }
    };
}

async function extractAndFetchIpfsData(targetRole = null) {
    try {
        let logMessage = "🔍 Fetching all profile accounts...";
        let filters = {
            commitment: 'confirmed',
            encoding: 'base64',
        };
        
        // Add role filter if specified
        if (targetRole) {
            console.log(`🎯 Filtering for role: ${targetRole}`);
            filters.filters = [createRoleFilter(targetRole)];
            logMessage = `🔍 Fetching profile accounts with role: ${targetRole}...`;
        }
        console.log("final filters:", filters);
        console.log(logMessage);
        
        const accounts = await connection.getProgramAccounts(PROGRAM_ID, filters);
        
        console.log(`Found ${accounts.length} accounts`);
        
        if (accounts.length === 0) {
            console.log("No accounts found for this program");
            return [];
        }
        
        // Step 1: Extract all IPFS CIDs
        console.log("\n📋 Step 1: Extracting IPFS CIDs...");
        const ipfsCids = [];
        
        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            console.log(`Processing account ${i + 1}/${accounts.length}: ${account.pubkey.toString()}`);
            
            try {
                const buffer = Buffer.from(account.account.data, 'base64');
                const ipfsCid = extractIpfsFromProfile(buffer);
                
                if (ipfsCid && ipfsCid.trim() !== '') {
                    ipfsCids.push({
                        accountAddress: account.pubkey.toString(),
                        ipfsCid: ipfsCid.trim()
                    });
                    console.log(`✅ Found IPFS CID: ${ipfsCid}`);
                } else {
                    console.log(`⚠️  Empty IPFS CID`);
                }
                
            } catch (error) {
                console.error(`❌ Failed to extract from ${account.pubkey.toString()}:`, error.message);
            }
        }
        
        // Remove duplicates
        const uniqueCids = ipfsCids.filter((item, index, self) => 
            index === self.findIndex(t => t.ipfsCid === item.ipfsCid)
        );
        
        console.log(`\n📊 Found ${ipfsCids.length} CIDs (${uniqueCids.length} unique)`);
        
        // Step 2: Fetch data from IPFS
        console.log("\n🌐 Step 2: Fetching data from IPFS...");
        const ipfsData = [];
        
        for (let i = 0; i < uniqueCids.length; i++) {
            const { accountAddress, ipfsCid } = uniqueCids[i];
            console.log(`\n📥 Fetching ${i + 1}/${uniqueCids.length}: ${ipfsCid}`);
            
            try {
                const result = await fetchFromIpfs(ipfsCid);
                
                ipfsData.push({
                    accountAddress: accountAddress,
                    ipfsCid: ipfsCid,
                    success: result.success,
                    data: result.data,
                    contentType: result.contentType,
                    gateway: result.gateway,
                    size: result.size,
                    fetchedAt: new Date().toISOString()
                });
                
                console.log(`✅ Successfully fetched data (${result.size} bytes)`);
                console.log(`📄 Content type: ${result.contentType}`);
                
                // Preview the data
                if (typeof result.data === 'object') {
                    console.log(`📋 Preview: ${JSON.stringify(result.data).substring(0, 200)}...`);
                } else {
                    console.log(`📋 Preview: ${result.data.substring(0, 200)}...`);
                }
                
            } catch (error) {
                console.error(`❌ Failed to fetch ${ipfsCid}:`, error.message);
                
                ipfsData.push({
                    accountAddress: accountAddress,
                    ipfsCid: ipfsCid,
                    success: false,
                    error: error.message,
                    fetchedAt: new Date().toISOString()
                });
            }
            
            // Add a small delay to be respectful to IPFS gateways
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        return ipfsData;
        
    } catch (error) {
        console.error("❌ Error in extraction process:", error);
        throw error;
    }
}

function generateSummary(ipfsData) {
    const successful = ipfsData.filter(item => item.success);
    const failed = ipfsData.filter(item => !item.success);
    
    const contentTypes = {};
    successful.forEach(item => {
        const type = item.contentType || 'unknown';
        contentTypes[type] = (contentTypes[type] || 0) + 1;
    });
    
    return {
        total: ipfsData.length,
        successful: successful.length,
        failed: failed.length,
        contentTypes: contentTypes,
        averageSize: successful.length > 0 ? 
            successful.reduce((sum, item) => sum + (parseInt(item.size) || 0), 0) / successful.length : 0
    };
}

function saveIpfsData(ipfsData, filename = 'fetched_ipfs_data.json') {
    const summary = generateSummary(ipfsData);
    
    const output = {
        fetchedAt: new Date().toISOString(),
        programId: PROGRAM_ID.toString(),
        summary: summary,
        ipfsData: ipfsData
    };
    
    fs.writeFileSync(filename, JSON.stringify(output, null, 2));
    console.log(`\n💾 Complete IPFS data saved to ${filename}`);
    
    // Save successful data only
    const successfulData = ipfsData.filter(item => item.success);
    if (successfulData.length > 0) {
        const successFilename = 'successful_ipfs_data.json';
        fs.writeFileSync(successFilename, JSON.stringify(successfulData, null, 2));
        console.log(`💾 Successful IPFS data saved to ${successFilename}`);
    }
    
    // Save just the fetched content
    const contentOnly = successfulData.map(item => ({
        ipfsCid: item.ipfsCid,
        data: item.data
    }));
    
    if (contentOnly.length > 0) {
        const contentFilename = 'ipfs_content_only.json';
        fs.writeFileSync(contentFilename, JSON.stringify(contentOnly, null, 2));
        console.log(`💾 IPFS content only saved to ${contentFilename}`);
    }
}

async function main(targetRole = null) {
    try {
        console.log("🚀 Starting IPFS data extraction and fetching...");
        
        if (targetRole) {
            console.log(`🎯 Target role: ${targetRole}`);
            if (!ROLE_OFFSETS[targetRole]) {
                console.error(`❌ Invalid role: ${targetRole}`);
                console.log(`Valid roles: ${Object.keys(ROLE_OFFSETS).join(', ')}`);
                return;
            }
        }
        
        console.log("This will extract IPFS CIDs from Solana accounts and fetch the actual data from IPFS\n");

        const ipfsData = await extractAndFetchIpfsData(targetRole);
        
        const summary = generateSummary(ipfsData);
        
        console.log("\n📊 FINAL SUMMARY");
        console.log("=" * 60);
        if (targetRole) {
            console.log(`Role filter: ${targetRole}`);
        }
        console.log(`Total IPFS CIDs processed: ${summary.total}`);
        console.log(`Successfully fetched: ${summary.successful}`);
        console.log(`Failed to fetch: ${summary.failed}`);
        console.log(`Average content size: ${Math.round(summary.averageSize)} bytes`);
        
        console.log("\n📄 Content Types Found:");
        Object.entries(summary.contentTypes).forEach(([type, count]) => {
            console.log(`  ${type}: ${count}`);
        });
        
        saveIpfsData(ipfsData);
        
        console.log("\n🎉 IPFS data extraction and fetching completed!");
        return ipfsData;
        
    } catch (error) {
        console.error("❌ Process failed:", error);
        throw error;
    }
}

module.exports = {
    extractAndFetchIpfsData,
    fetchFromIpfs,
    extractIpfsFromProfile,
    createRoleFilter,
    generateSummary,
    saveIpfsData,
    ROLE_OFFSETS,
    main
};

if (require.main === module) {
    const targetRole = process.argv[2];

    main("legal").catch(console.error);
}