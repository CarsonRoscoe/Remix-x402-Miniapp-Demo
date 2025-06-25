import { NextRequest, NextResponse } from 'next/server';
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";
import { getAddress } from 'viem';

// Initialize the Neynar client on the server side
const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY || '',
});

const client = new NeynarAPIClient(config);

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

    const result = await client.fetchBulkUsersByEthOrSolAddress({
      addresses: [getAddress(walletAddress)]
    });


    const users = Object.values(result);

    if (users.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No Farcaster user found for this wallet address',
        debug: {
          searchedAddress: walletAddress,
        }
      });
    }

    if (users[0].length == 0) {
      return NextResponse.json({
        success: false,
        error: 'No Farcaster user found for this wallet address',
        debug: {
          searchedAddress: walletAddress,
        }
      });
    }

    const user = users[0][0];

    return NextResponse.json({
      success: true,
      user: {
        fid: user.fid,
        username: user.username,
        displayName: user.display_name,
        pfpUrl: user.pfp_url,
        followerCount: user.follower_count,
        followingCount: user.following_count,
        verifications: user.verifications,
        custodyAddress: user.custody_address,
      }
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