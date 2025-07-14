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
  hasAccount: boolean;
  refetch: () => Promise<void>;
}

export function useFarcaster(walletAddress?: string): UseFarcasterReturn {
  const { context } = useMiniKit();
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAccount, setHasAccount] = useState(false);

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
      setHasAccount(true);
      setLoading(false);
      return;
    }

    // If no wallet address and no context, reset state
    if (!walletAddress) {
      setUser(null);
      setError(null);
      setHasAccount(false);
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

      if (data.success) {
        setUser(data.user);
        setHasAccount(data.hasAccount);
        setError(null);
      } else {
        setUser(null);
        setHasAccount(false);
        // Handle specific error codes
        switch (data.code) {
          case 'WALLET_REQUIRED':
            setError('Wallet address is required');
            break;
          case 'INVALID_ADDRESS':
            setError('Invalid wallet address format');
            break;
          case 'API_ERROR':
            setError('Failed to connect to Farcaster');
            break;
          default:
            setError(data.error || 'Failed to fetch Farcaster account');
        }
      }
    } catch (err) {
      setUser(null);
      setHasAccount(false);
      setError('Failed to connect to Farcaster');
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
    hasAccount,
    refetch: fetchUser,
  };
}
