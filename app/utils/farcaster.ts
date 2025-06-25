import { useState, useEffect, useCallback } from 'react';

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
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    if (!walletAddress) {
      setUser(null);
      setError(null);
      return;
    }

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
  }, [walletAddress]);

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

// Function to get Farcaster ID from wallet address
export async function getFarcasterId(walletAddress: string): Promise<string | null> {
  try {
    const response = await fetch('/api/farcaster/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ walletAddress }),
    });

    if (!response.ok) {
      console.error('Failed to fetch Farcaster user:', response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (data.success && data.user?.fid) {
      return data.user.fid.toString();
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching Farcaster ID:', error);
    return null;
  }
}

// Function to get Farcaster profile picture
export async function getFarcasterProfilePicture(walletAddress: string): Promise<string | null> {
  try {
    const response = await fetch('/api/farcaster/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ walletAddress }),
    });

    if (!response.ok) {
      console.error('Failed to fetch Farcaster user:', response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (data.success && data.user?.pfpUrl) {
      return data.user.pfpUrl;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching Farcaster profile:', error);
    return null;
  }
}

// Function to get complete Farcaster user data
export async function getFarcasterUser(walletAddress: string) {
  try {
    const response = await fetch('/api/farcaster/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ walletAddress }),
    });

    if (!response.ok) {
      console.error('Failed to fetch Farcaster user:', response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (data.success) {
      return data.user;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching Farcaster user:', error);
    return null;
  }
} 