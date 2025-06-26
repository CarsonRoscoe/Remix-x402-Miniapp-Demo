import { NextRequest, NextResponse } from 'next/server';
import { getNotificationTokens, updateManyNotificationTokens } from '../../db';

export async function POST(request: NextRequest) {
  try {
    const { notificationId, title, body, targetUrl, secret } = await request.json();
    
    // Verify secret parameter
    if (!secret || secret !== process.env.NOTIFICATION_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get all active notification tokens
    const tokens = await getNotificationTokens();
    
    if (tokens.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No active notification tokens found' 
      });
    }
    
    // Group tokens by URL (different Farcaster clients may use different URLs)
    const tokensByUrl = tokens.reduce((acc: Record<string, string[]>, token: { url: string; token: string }) => {
      if (!acc[token.url]) {
        acc[token.url] = [];
      }
      acc[token.url].push(token.token);
      return acc;
    }, {} as Record<string, string[]>);
    
    const results = {
      successfulTokens: [] as string[],
      invalidTokens: [] as string[],
      rateLimitedTokens: [] as string[],
    };
    
    // Send notifications to each URL (up to 100 tokens per request)
    for (const [url, tokenBatch] of Object.entries(tokensByUrl) as [string, string[]][]) {
      // Split into batches of 100 tokens
      for (let i = 0; i < tokenBatch.length; i += 100) {
        const batch = tokenBatch.slice(i, i + 100);
        
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              notificationId,
              title,
              body,
              targetUrl,
              tokens: batch,
            }),
          });
          
          if (response.ok) {
            const result = await response.json();
            results.successfulTokens.push(...(result.successfulTokens || []));
            results.invalidTokens.push(...(result.invalidTokens || []));
            results.rateLimitedTokens.push(...(result.rateLimitedTokens || []));
          } else {
            console.error(`Failed to send notifications to ${url}:`, response.status);
          }
        } catch (error) {
          console.error(`Error sending notifications to ${url}:`, error);
        }
      }
    }
    
    // Mark invalid tokens as inactive
    if (results.invalidTokens.length > 0) {
      await updateManyNotificationTokens(results.invalidTokens);
    }
    
    return NextResponse.json({
      success: true,
      results,
      totalTokens: tokens.length,
    });
  } catch (error) {
    console.error('Error sending notifications:', error);
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
  }
} 