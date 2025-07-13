import { NextRequest, NextResponse } from 'next/server';
import { getUserByAddress, getVideos } from '../db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Missing walletAddress parameter' }, { status: 400 });
    }

    // Look up the user by wallet address
    const user = await getUserByAddress(walletAddress);
    if (!user) {
      return NextResponse.json({ success: true, videos: [] });
    }

    // Fetch videos for the user ID
    const videos = await getVideos(user.id);

    return NextResponse.json({ success: true, videos });
  } catch (error) {
    console.error('Error in /api/videos:', error);
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
} 