import { NextRequest, NextResponse } from 'next/server';
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";
import { getAddress } from 'viem';

// Initialize the Neynar client on the server side
const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY || '',
});

const client = new NeynarAPIClient(config);

// In-memory cache for Farcaster user data
interface CacheEntry {
  data: {
    fid: number;
    username: string;
    displayName: string;
    pfpUrl: string;
    followerCount: number;
    followingCount: number;
    verifications: string[];
    custodyAddress: string;
  } | null;  // Allow null for "no account" cache
  timestamp: number;
}

const userCache = new Map<string, CacheEntry>();

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const CACHE_CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes
const NO_ACCOUNT_CACHE_TTL = 1 * 60 * 1000; // 1 minute for "no account" results

// Cleanup old cache entries periodically
let lastCleanup = Date.now();

function cleanupCache() {
  const now = Date.now();
  if (now - lastCleanup > CACHE_CLEANUP_INTERVAL) {
    for (const [key, entry] of userCache.entries()) {
      const ttl = entry.data === null ? NO_ACCOUNT_CACHE_TTL : CACHE_TTL;
      if (now - entry.timestamp > ttl) {
        userCache.delete(key);
      }
    }
    lastCleanup = now;
  }
}

function getCachedUser(walletAddress: string) {
  cleanupCache();
  const entry = userCache.get(walletAddress);
  if (entry) {
    const ttl = entry.data === null ? NO_ACCOUNT_CACHE_TTL : CACHE_TTL;
    if (Date.now() - entry.timestamp < ttl) {
      return entry.data;
    }
  }
  return undefined;
}

function setCachedUser(walletAddress: string, userData: CacheEntry['data']) {
  userCache.set(walletAddress, {
    data: userData,
    timestamp: Date.now(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Wallet address is required',
          code: 'WALLET_REQUIRED'
        },
        { status: 400 }
      );
    }

    try {
      const normalizedAddress = getAddress(walletAddress);
      
      // Check cache first
      const cachedUser = getCachedUser(normalizedAddress);
      if (cachedUser !== undefined) {
        console.log(`Cache hit for wallet: ${normalizedAddress}`);
        return NextResponse.json({
          success: true,
          user: cachedUser,
          cached: true,
          hasAccount: cachedUser !== null
        });
      }

      console.log(`Cache miss for wallet: ${normalizedAddress}, fetching from API`);

      const result = await client.fetchBulkUsersByEthOrSolAddress({
        addresses: [normalizedAddress]
      });

      const users = Object.values(result);

      // Handle case where no Farcaster account exists
      if (!users.length || !users[0].length) {
        // Cache the "no account" result
        setCachedUser(normalizedAddress, null);
        
        return NextResponse.json({
          success: true,
          user: null,
          hasAccount: false,
          cached: false
        });
      }

      const user = users[0][0];
      const userData = {
        fid: user.fid,
        username: user.username,
        displayName: user.display_name || '',
        pfpUrl: user.pfp_url || '',
        followerCount: user.follower_count,
        followingCount: user.following_count,
        verifications: user.verifications || [],
        custodyAddress: user.custody_address,
      };

      // Cache the user data
      setCachedUser(normalizedAddress, userData);

      return NextResponse.json({
        success: true,
        user: userData,
        hasAccount: true,
        cached: false
      });

    } catch (err) {
      if (err instanceof Error && err.message.includes('invalid address')) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Invalid wallet address format',
            code: 'INVALID_ADDRESS'
          },
          { status: 400 }
        );
      }
      throw err; // Re-throw for general error handling
    }

  } catch (error) {
    console.error('Error fetching Farcaster user:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch Farcaster user',
        code: 'API_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 