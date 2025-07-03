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
    verifications: {
      type: string;
      verified: boolean;
    }[];
    custodyAddress: string;
  };
  timestamp: number;
}

const userCache = new Map<string, CacheEntry>();

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const CACHE_CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

// Cleanup old cache entries periodically
let lastCleanup = Date.now();

function cleanupCache() {
  const now = Date.now();
  if (now - lastCleanup > CACHE_CLEANUP_INTERVAL) {
    for (const [key, entry] of userCache.entries()) {
      if (now - entry.timestamp > CACHE_TTL) {
        userCache.delete(key);
      }
    }
    lastCleanup = now;
  }
}

function getCachedUser(walletAddress: string) {
  cleanupCache();
  const entry = userCache.get(walletAddress);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  return null;
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
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const normalizedAddress = getAddress(walletAddress);

    // Check cache first
    const cachedUser = getCachedUser(normalizedAddress);
    if (cachedUser) {
      console.log(`Cache hit for wallet: ${normalizedAddress}`);
      return NextResponse.json({
        success: true,
        user: cachedUser,
        cached: true
      });
    }

    console.log(`Cache miss for wallet: ${normalizedAddress}, fetching from API`);

    const result = await client.fetchBulkUsersByEthOrSolAddress({
      addresses: [normalizedAddress]
    });

    const users = Object.values(result);

    if (users.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No Farcaster user found for this wallet address',
        debug: {
          searchedAddress: normalizedAddress,
        }
      });
    }

    if (users[0].length == 0) {
      return NextResponse.json({
        success: false,
        error: 'No Farcaster user found for this wallet address',
        debug: {
          searchedAddress: normalizedAddress,
        }
      });
    }

    const user = users[0][0];
    const userData = {
      fid: user.fid,
      username: user.username,
      displayName: user.display_name,
      pfpUrl: user.pfp_url,
      followerCount: user.follower_count,
      followingCount: user.following_count,
      verifications: user.verifications,
      custodyAddress: user.custody_address,
    };

    // Cache the user data
    setCachedUser(normalizedAddress, userData);

    return NextResponse.json({
      success: true,
      user: userData,
      cached: false
    });

  } catch (error) {
    console.error('Error fetching Farcaster user:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch Farcaster user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 