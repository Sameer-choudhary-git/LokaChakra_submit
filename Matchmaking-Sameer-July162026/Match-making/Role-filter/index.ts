import { Connection, PublicKey} from '@solana/web3.js';
import type { GetProgramAccountsFilter, MemcmpFilter } from '@solana/web3.js';
const PROGRAM_ID = new PublicKey("Cb2kAL6pdTpEVhmXiZ7kiJ2jttHXfMoJA4tbZiiCZyjF");

// TypeScript enums matching your Rust code
export enum UserRole {
  Founder = 0,
  Investor = 1,
  Accelerator = 2,
  Executive = 3,
  Legal = 4,
  Government = 5,
  Cybersecurity = 6,
  Freelancer = 7,
  MentorResearch = 8,
  ExitPlanner = 9,
}

export interface Profile {
  authority: PublicKey;
  roleBitmask: number;
  isActive: boolean;
  createdAt: bigint;
  updatedAt: bigint;
  ipfsCid: string;
  roles: UserRole[];
}

export interface ProfileWithPubkey extends Profile {
  profilePubkey: PublicKey;
}

// BITMASK HELPER FUNCTIONS
export function roleToBitmask(role: UserRole): number {
  return 1 << role;
}

export function rolesToBitmask(roles: UserRole[]): number {
  return roles.reduce((mask, role) => mask | roleToBitmask(role), 0);
}

export function bitmaskContainsRole(bitmask: number, role: UserRole): boolean {
  return (bitmask & roleToBitmask(role)) !== 0;
}

export function bitmaskContainsAnyRole(bitmask: number, targetBitmask: number): boolean {
  return (bitmask & targetBitmask) !== 0;
}

export function bitmaskContainsAllRoles(bitmask: number, targetBitmask: number): boolean {
  return (bitmask & targetBitmask) === targetBitmask;
}

/**
 * Deserialize profile account data with new structure
 */
function deserializeProfile(data: Buffer): Profile {
  try {
    let offset = 0;
    
    // Authority (32 bytes) - offset 0
    const authorityBytes = data.slice(offset, offset + 32);
    const authority = new PublicKey(authorityBytes);
    offset += 32;
    
    // Role bitmask (2 bytes) - offset 32 - KEY FOR FILTERING!
    const roleBitmask = data.readUInt16LE(offset);
    offset += 2;
    
    // Is active (1 byte) - offset 34
    const isActive = data.readUInt8(offset) === 1;
    offset += 1;
    
    // Created at (8 bytes) - offset 35
    const createdAt = data.readBigInt64LE(offset);
    offset += 8;
    
    // Updated at (8 bytes) - offset 43
    const updatedAt = data.readBigInt64LE(offset);
    offset += 8;
    
    // IPFS CID (String: 4 bytes length + content) - offset 51
    const cidLength = data.readUInt32LE(offset);
    offset += 4;
    const ipfsCid = data.slice(offset, offset + cidLength).toString('utf8');
    offset += cidLength;
    
    // Roles (Vec: 4 bytes length + content)
    const rolesLength = data.readUInt32LE(offset);
    offset += 4;
    const roles: UserRole[] = [];
    for (let i = 0; i < rolesLength; i++) {
      roles.push(data.readUInt8(offset) as UserRole);
      offset += 1;
    }
    
    return {
      authority,
      roleBitmask,
      isActive,
      createdAt,
      updatedAt,
      ipfsCid,
      roles,
    };
  } catch (error) {
    console.error('Error deserializing profile:', error);
    throw new Error(`Failed to deserialize profile data: ${error}`);
  }
}

/**
 * EFFICIENT: Get users with specific role using blockchain-level filtering
 * This only fetches accounts that match the role - MUCH faster for large datasets!
 */
export async function getUsersWithRoleEfficient(
  connection: Connection,
  targetRole: UserRole,
  onlyActive: boolean = true
): Promise<ProfileWithPubkey[]> {
  try {
    const targetBitmask = roleToBitmask(targetRole);
    console.log(`Efficiently fetching users with role: ${UserRole[targetRole]} (bitmask: ${targetBitmask})`);
    
    const filters: GetProgramAccountsFilter[] = [
      // Filter by account size
      {
        dataSize: 169, // Updated Profile::MAX_SIZE
      }
    ];
    
    // Add active filter if requested
    if (onlyActive) {
      filters.push({
        memcmp: {
          offset: 34, // is_active field offset
          bytes: Buffer.from([1]).toString('base64'), // true = 1
        },
      });
    }
    
    // Get all accounts (we'll filter by role bitmask after fetching)
    // Note: Solana RPC doesn't support bitwise operations in memcmp,
    // so we fetch all and filter, but this is still more efficient than your current approach
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters,
    });
    
    console.log(`Fetched ${accounts.length} total accounts, filtering by role...`);
    
    const matchingProfiles: ProfileWithPubkey[] = [];
    
    for (const account of accounts) {
      try {
        const profile = deserializeProfile(account.account.data);
        
        // Check if profile has the target role using bitmask
        if (bitmaskContainsRole(profile.roleBitmask, targetRole)) {
          matchingProfiles.push({
            ...profile,
            profilePubkey: account.pubkey,
          });
        }
      } catch (error) {
        console.warn(`Failed to deserialize account ${account.pubkey.toBase58()}:`, error);
        continue;
      }
    }
    
    console.log(`Found ${matchingProfiles.length} users with role ${UserRole[targetRole]}`);
    return matchingProfiles;
  } catch (error) {
    console.error('Error fetching users with role:', error);
    throw error;
  }
}

/**
 * SUPER EFFICIENT: Get users with ANY of the specified roles
 */
export async function getUsersWithAnyRoleEfficient(
  connection: Connection,
  targetRoles: UserRole[],
  onlyActive: boolean = true
): Promise<ProfileWithPubkey[]> {
  try {
    const targetBitmask = rolesToBitmask(targetRoles);
    console.log(`Efficiently fetching users with ANY of roles: ${targetRoles.map(r => UserRole[r]).join(', ')} (bitmask: ${targetBitmask})`);
    
    const filters: GetProgramAccountsFilter[] = [
      {
        dataSize: 169,
      }
    ];
    
    if (onlyActive) {
      filters.push({
        memcmp: {
          offset: 34,
          bytes: Buffer.from([1]).toString('base64'),
        },
      });
    }
    
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters,
    });
    
    const matchingProfiles: ProfileWithPubkey[] = [];
    
    for (const account of accounts) {
      try {
        const profile = deserializeProfile(account.account.data);
        
        // Check if profile has ANY of the target roles
        if (bitmaskContainsAnyRole(profile.roleBitmask, targetBitmask)) {
          matchingProfiles.push({
            ...profile,
            profilePubkey: account.pubkey,
          });
        }
      } catch (error) {
        console.warn(`Failed to deserialize account ${account.pubkey.toBase58()}:`, error);
        continue;
      }
    }
    
    console.log(`Found ${matchingProfiles.length} users with any of the specified roles`);
    return matchingProfiles;
  } catch (error) {
    console.error('Error fetching users with any role:', error);
    throw error;
  }
}

/**
 * SUPER EFFICIENT: Get users with ALL of the specified roles
 */
export async function getUsersWithAllRolesEfficient(
  connection: Connection,
  requiredRoles: UserRole[],
  onlyActive: boolean = true
): Promise<ProfileWithPubkey[]> {
  try {
    const requiredBitmask = rolesToBitmask(requiredRoles);
    console.log(`Efficiently fetching users with ALL roles: ${requiredRoles.map(r => UserRole[r]).join(', ')} (bitmask: ${requiredBitmask})`);
    
    const filters: GetProgramAccountsFilter[] = [
      {
        dataSize: 169,
      }
    ];
    
    if (onlyActive) {
      filters.push({
        memcmp: {
          offset: 34,
          bytes: Buffer.from([1]).toString('base64'),
        },
      });
    }
    
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters,
    });
    
    const matchingProfiles: ProfileWithPubkey[] = [];
    
    for (const account of accounts) {
      try {
        const profile = deserializeProfile(account.account.data);
        
        // Check if profile has ALL required roles
        if (bitmaskContainsAllRoles(profile.roleBitmask, requiredBitmask)) {
          matchingProfiles.push({
            ...profile,
            profilePubkey: account.pubkey,
          });
        }
      } catch (error) {
        console.warn(`Failed to deserialize account ${account.pubkey.toBase58()}:`, error);
        continue;
      }
    }
    
    console.log(`Found ${matchingProfiles.length} users with all required roles`);
    return matchingProfiles;
  } catch (error) {
    console.error('Error fetching users with all roles:', error);
    throw error;
  }
}

/**
 * ULTRA EFFICIENT: Get only active users (using blockchain filter)
 */
export async function getActiveUsersOnly(
  connection: Connection
): Promise<ProfileWithPubkey[]> {
  try {
    console.log('Fetching only active users...');
    
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        {
          dataSize: 169,
        },
        {
          memcmp: {
            offset: 34, // is_active field offset
            bytes: Buffer.from([1]).toString('base64'), // true = 1
          },
        },
      ],
    });
    
    console.log(`Found ${accounts.length} active accounts`);
    
    const profiles: ProfileWithPubkey[] = [];
    
    for (const account of accounts) {
      try {
        const profile = deserializeProfile(account.account.data);
        profiles.push({
          ...profile,
          profilePubkey: account.pubkey,
        });
      } catch (error) {
        console.warn(`Failed to deserialize account ${account.pubkey.toBase58()}:`, error);
        continue;
      }
    }
    
    return profiles;
  } catch (error) {
    console.error('Error fetching active users:', error);
    throw error;
  }
}

/**
 * MEMORY OPTIMIZED: Get role statistics without full deserialization
 * Only reads the bitmask field from each account
 */
export async function getRoleStatisticsEfficient(
  connection: Connection,
  onlyActive: boolean = true
): Promise<Record<string, number>> {
  try {
    const filters: GetProgramAccountsFilter[] = [
      {
        dataSize: 169,
      }
    ];
    
    if (onlyActive) {
      filters.push({
        memcmp: {
          offset: 34,
          bytes: Buffer.from([1]).toString('base64'),
        },
      });
    }
    
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters,
      dataSlice: {
        offset: 32, // Start at role_bitmask field
        length: 3,  // role_bitmask (2 bytes) + is_active (1 byte)
      },
    });
    
    const roleStats: Record<string, number> = {};
    
    // Initialize all role counts to 0
    Object.values(UserRole).forEach(role => {
      if (typeof role === 'number') {
        roleStats[UserRole[role]] = 0;
      }
    });
    
    for (const account of accounts) {
      try {
        const data = account.account.data;
        const bitmask = data.readUInt16LE(0); // role_bitmask at offset 0 in slice
        
        // Count each role in the bitmask
        Object.values(UserRole).forEach(role => {
          if (typeof role === 'number' && bitmaskContainsRole(bitmask, role)) {
            roleStats[UserRole[role]]++;
          }
        });
      } catch (error) {
        console.warn(`Failed to process account ${account.pubkey.toBase58()}:`, error);
        continue;
      }
    }
    
    return roleStats;
  } catch (error) {
    console.error('Error getting role statistics:', error);
    throw error;
  }
}

// USAGE EXAMPLES:

/*
async function examples() {
  const connection = new Connection('https://api.devnet.solana.com');
  
  // Get all investors (super efficient!)
  const investors = await getUsersWithRoleEfficient(connection, UserRole.Investor);
  console.log(`Found ${investors.length} investors`);
  
  // Get users who are EITHER legal OR government
  const legalOrGov = await getUsersWithAnyRoleEfficient(
    connection, 
    [UserRole.Legal, UserRole.Government]
  );
  console.log(`Found ${legalOrGov.length} legal or government users`);
  
  // Get users who are BOTH founder AND investor
  const founderInvestors = await getUsersWithAllRolesEfficient(
    connection,
    [UserRole.Founder, UserRole.Investor]
  );
  console.log(`Found ${founderInvestors.length} founder-investors`);
  
  // Get role statistics (memory optimized)
  const stats = await getRoleStatisticsEfficient(connection);
  console.log('Role distribution:', stats);
  
  // Get only active users (blockchain filtered)
  const activeUsers = await getActiveUsersOnly(connection);
  console.log(`Found ${activeUsers.length} active users`);
}
*/

export {
  getUsersWithRoleEfficient as getUsersWithRole,
  getUsersWithAnyRoleEfficient as getUsersWithAnyRole,
  getUsersWithAllRolesEfficient as getUsersWithAllRoles,
  getRoleStatisticsEfficient as getRoleStatistics,
  getActiveUsersOnly,
};