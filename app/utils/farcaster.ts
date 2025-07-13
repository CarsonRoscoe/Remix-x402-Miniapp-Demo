import { useState, useEffect, useCallback } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';

export interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  followerCount: number;
  followingCount: number;
  verifications: string[];
  custodyAddress: string;
}

export interface UseFarcasterReturn {
  user: FarcasterUser | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFarcaster(walletAddress?: string): UseFarcasterReturn {
  const { context } = useMiniKit();
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    // If we have a MiniKit context with user info, use that
    if (context?.user) {
      setUser({
        fid: context.user.fid,
        username: context.user.username || '',
        displayName: context.user.displayName || context.user.username || '',
        pfpUrl: context.user.pfpUrl || '',
        followerCount: 0, // Not available in context
        followingCount: 0, // Not available in context
        verifications: [], // Not available in context
        custodyAddress: context.user.location?.description || '',
      });
      setError(null);
      setLoading(false);
      return;
    }

    // If no wallet address and no context, reset state
    if (!walletAddress) {
      setUser(null);
      setError(null);
      return;
    }

    // Fall back to Neynar API
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/farcaster/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
        setError(null);
      } else {
        setUser(null);
        setError(data.error || 'No Farcaster account found');
      }
    } catch (err) {
      setUser(null);
      setError('Failed to fetch Farcaster account');
      console.error('Error fetching Farcaster user:', err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, context?.user]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return {
    user,
    loading,
    error,
    refetch: fetchUser,
  };
}
