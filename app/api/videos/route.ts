import { NextRequest, NextResponse } from 'next/server';
import { getVideos } from '../db';
import { getOrUpdateUser } from '../db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    // Get or create user
    const user = await getOrUpdateUser({ walletAddress });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get videos for the user
    const videos = await getVideos(user.id);

    return NextResponse.json({ 
      success: true, 
      videos 
    });

  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' }, 
      { status: 500 }
    );
  }
} 