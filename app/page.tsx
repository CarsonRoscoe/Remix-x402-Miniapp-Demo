'use client';

import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { getWalletClient } from 'wagmi/actions';
import { config } from './viem-config';
import { wrapFetchWithPayment } from 'x402-fetch';
import { 
  Wallet,
  ConnectWallet,
  WalletDropdown,
  WalletDropdownDisconnect 
} from '@coinbase/onchainkit/wallet';
import {
  Name,
  Identity,
  Address,
  Avatar,
  EthBalance,
} from '@coinbase/onchainkit/identity';
import { ZoraCoinButton } from './components/ZoraCoinButton';
import { RemixCard } from './components/RemixCard';
import { ShareOnFarcaster } from './components/ShareOnFarcaster';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { useFarcaster } from './utils/farcaster';

type GenerationType = 'daily-remix' | 'custom-remix' | 'custom-video' | null;
type GenerationStatus = 'idle' | 'generating' | 'success' | 'error';
type TabType = 'home' | 'history' | 'pending';

interface Video {
  id: string;
  videoIpfs: string;
  videoUrl?: string; // Original video URL from AI generation (temporary, 7 days)
  type: string;
  createdAt: string;
  remix?: {
    id: string;
    isMinted: boolean;
    promptId?: string | null;
    zoraCoinData?: {
      name: string;
      symbol: string;
      uri: string;
      payoutRecipient: string;
      chainId: string;
      currency: string;
      owner: string;
      txHash: string;
      contractAddress: string;
    } | null;
    prompt?: {
      id: string;
      prompt: string;
      date: string;
    } | null;
  } | null;
}

// Add new type for pending jobs
interface PendingVideo {
  id: string;
  type: string;
  prompt?: string;
  status: string;
  errorMessage?: string;
  createdAt: string;
}

interface FarcasterUser {
  displayName: string;
  username: string;
  pfpUrl: string;
}

export default function App() {
  const { address, isConnected, connector, chainId } = useAccount();
  const { context, isFrameReady, setFrameReady } = useMiniKit();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [generationType, setGenerationType] = useState<GenerationType>(null);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remixId, setRemixId] = useState<string | null>(null);
  const [ipfsUrl, setIpfsUrl] = useState<string | null>(null);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const { user: farcasterUser } = useFarcaster(address);
  
  // Get Farcaster user from context (miniapp frame). If no frame is connected, but wallet collection is connected, try to identify the user via farcaster api
  const user = (context?.user) || farcasterUser;

  // Data for history tab
  const [videos, setVideos] = useState<Video[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);

  // Pending jobs state
  const [pendingJobs, setPendingJobs] = useState<PendingVideo[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  // Call setFrameReady() when your app is ready to be shown
  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [isFrameReady, setFrameReady]);

  // Initialize Farcaster Mini App SDK
  useEffect(() => {
    const initMiniApp = async () => {
      try {
        if (!context) return;
        
        console.log('Mini App context:', context);
        await setFrameReady();
        console.log('Mini App ready signal sent');
      } catch (error) {
        console.log('Not running in Mini App context or SDK not available:', error);
      }
    };

    initMiniApp();
  }, [context, setFrameReady]);





  const fetchVideos = useCallback(async () => {
    if (!address) return;
    
    setLoadingVideos(true);
    try {
      const response = await fetch(`/api/videos?walletAddress=${address}`);
      const data = await response.json();
      
      if (data.success) {
        setVideos(data.videos);
      } else {
        console.error('Failed to fetch videos:', data.error);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoadingVideos(false);
    }
  }, [address]);

  // Fetch data when tab changes or user connects
  useEffect(() => {
    if (isConnected && address && activeTab === 'history') {
      fetchVideos();
    }
  }, [activeTab, isConnected, address, fetchVideos]);

  // Fetch pending jobs for the connected user
  const fetchPendingJobs = useCallback(async () => {
    if (!address) return;
    setLoadingPending(true);
    try {
      const response = await fetch(`/api/pending?walletAddress=${address}`);
      const data = await response.json();
      if (data.success) {
        const newPendingJobs = data.pendingVideos;
        const previousCount = pendingJobs.length;
        const processingResult = data.processingResult;
        
        setPendingJobs(newPendingJobs);
        
        // Show processing results if any videos were processed
        if (processingResult && (processingResult.processed > 0 || processingResult.errors > 0)) {
          if (processingResult.processed > 0) {
            toast.success(`${processingResult.processed} video generation${processingResult.processed > 1 ? 's' : ''} completed! Check your History tab.`);
          }
          if (processingResult.errors > 0) {
            // Show detailed error information if available
            const errorDetails = processingResult.details?.filter((d: string) => d.startsWith('❌')) || [];
            if (errorDetails.length > 0) {
              console.error('Processing errors:', errorDetails);
            }
            toast.error(`${processingResult.errors} video generation${processingResult.errors > 1 ? 's' : ''} failed. Check the Pending tab for details.`);
          }
        }
        
        // If we were on pending tab but no more pending jobs, switch to home
        if (activeTab === 'pending' && newPendingJobs.length === 0) {
          setActiveTab('home');
          // Show notification that all jobs are complete
          if (previousCount > 0) {
            toast.success('All video generations are complete! Check your History tab.');
          }
        }
        
        // If pending jobs decreased, show notification
        if (newPendingJobs.length < previousCount && previousCount > 0) {
          const completedCount = previousCount - newPendingJobs.length;
          toast.success(`${completedCount} video generation${completedCount > 1 ? 's' : ''} completed! Check your History tab.`);
        }
      } else {
        setPendingJobs([]);
        // If we were on pending tab but no pending jobs, switch to home
        if (activeTab === 'pending') {
          setActiveTab('home');
        }
      }
    } catch {
      setPendingJobs([]);
      // If we were on pending tab but error occurred, switch to home
      if (activeTab === 'pending') {
        setActiveTab('home');
      }
    } finally {
      setLoadingPending(false);
    }
  }, [address, activeTab, pendingJobs.length]);

  // Fetch pending jobs when user connects and auto-refresh every 30 seconds
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isConnected && address) {
      fetchPendingJobs();
      interval = setInterval(fetchPendingJobs, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected, address, fetchPendingJobs]);

  const handleDailyRemix = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }
    
    if (!user) {
      setError('No Farcaster account found. Please ensure your wallet is connected to a Farcaster account.');
      return;
    }
    
    setGenerationType('daily-remix');
    setError(null);
    await generateVideo('daily-remix');
  };

  const handleCustomRemix = () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }
    
    if (!user) {
      setError('No Farcaster account found. Please ensure your wallet is connected to a Farcaster account.');
      return;
    }
    
    setGenerationType('custom-remix');
    setError(null);
  };

  const handleCustomVideo = () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }
    
    setGenerationType('custom-video');
    setError(null);
  };

  const handleCustomPromptSubmit = async () => {
    if (!customPrompt.trim()) {
      setError('Please enter a prompt');
      return;
    }
    
    if (generationType === 'custom-video' && !customImageUrl.trim()) {
      setError('Please provide an image URL for custom video generation');
      return;
    }
    
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }
    
    if ((generationType === 'daily-remix' || generationType === 'custom-remix') && !user) {
      setError('No Farcaster account found. Please ensure your wallet is connected to a Farcaster account.');
      return;
    }
    
    await generateVideo(generationType!);
  };

  const generateVideo = async (type: 'daily-remix' | 'custom-remix' | 'custom-video') => {
    if (!address) {
      setError('Wallet address not found');
      return;
    }

    setGenerationStatus('generating');
    setError(null);

    try {
      // Get the wallet client from Wagmi
      const walletClient = await getWalletClient(config, {
        account: address,
        chainId: chainId,
        connector: connector
      });

      if (!walletClient) {
        setError('Wallet client not available');
        setGenerationStatus('error');
        return;
      }

      // For x402-fetch, we need to pass the wallet client as the account
      const wrappedFetch = wrapFetchWithPayment(fetch, walletClient as unknown as Parameters<typeof wrapFetchWithPayment>[1], BigInt(2000000));

      // Call the appropriate API endpoint with wallet address
      let endpoint: string;
      let payload: Record<string, unknown>;

      switch (type) {
        case 'daily-remix':
          endpoint = '/api/generate/daily';
          payload = { walletAddress: address };
          break;
        case 'custom-remix':
          endpoint = '/api/generate/custom';
          payload = { prompt: customPrompt, walletAddress: address };
          break;
        case 'custom-video':
          endpoint = '/api/generate/custom-video';
          payload = { prompt: customPrompt, walletAddress: address, imageUrl: customImageUrl };
          break;
        default:
          throw new Error('Invalid generation type');
      }

      const response = await wrappedFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate video');
      }

      const data = await response.json();
      
      if (data.success) {
        // Check if this was a queued job (async generation)
        if (data.pendingVideoId && data.message && data.message.includes('queued')) {
          // This is an async job - show success message and switch to pending tab
          setGenerationStatus('success');
          toast.success('Video generation started! Check the Pending tab for updates.');
          
          // Fetch pending jobs immediately to show the new job
          await fetchPendingJobs();
          setActiveTab('pending');
          
          // Reset the generation flow since it's now in the background
          resetFlow();
        } else {
          // This is a sync job (shouldn't happen with current setup, but handle it)
          setGeneratedVideo(data.videoUrl);
          setIpfsUrl(data.ipfsUrl);
          setRemixId(data.remixId || null);
          setGenerationStatus('success');
        }
      } else {
        throw new Error('Failed to generate video');
      }

    } catch (error) {
      console.error('Error generating video:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate video');
      setGenerationStatus('error');
    }
  };

  const resetFlow = () => {
    setGenerationType(null);
    setGenerationStatus('idle');
    setCustomPrompt('');
    setCustomImageUrl('');
    setGeneratedVideo(null);
    setError(null);
    setRemixId(null);
    setIpfsUrl(null);
  };

  // Callback to refresh data when minting is complete
  const handleMintComplete = () => {
    // Refresh the videos data to show updated minting status
    if (activeTab === 'history') {
      fetchVideos();
    }
    // For newly generated videos, we could also refresh the current video data
    // but since it's a new generation, the user will likely create another or go to history
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return renderHomeTab();
      case 'history':
        return renderHistoryTab();
      case 'pending':
        return renderPendingTab();
      default:
        return renderHomeTab();
    }
  };

  const renderHomeTab = () => (
    <>
      {/* Hero Section */}
      {!(generatedVideo && generationStatus === 'success') && (
        <div className="text-center mb-2">
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
            Transform your Farcaster profile into amazing videos with AI
          </p>
          {isConnected && !user && (
            <div className="max-w-md mx-auto mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-300">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">
                  Connect an account with an associated Farcaster profile to access all features
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
            <button
              onClick={() => {
                setError(null);
                // Reset to initial state if we're in a generation flow
                if (generationType !== null || generationStatus !== 'idle') {
                  resetFlow();
                }
              }}
              className="m-4 px-8 py-2 bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium transition-colors duration-200"
            >
              Back
            </button>
        </div>
      )}

      {/* Main Action Buttons */}
      {generationType === null && generationStatus === 'idle' && (
        <div className="space-y-4">
          <button
            onClick={handleDailyRemix}
            disabled={!isConnected || !user}
            title={!isConnected ? 'Connect your wallet' : !user ? 'Connected account does not have an associated Farcaster account' : ''}
            className={`w-full group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 ${
              !isConnected || !user
                ? 'bg-slate-400 dark:bg-slate-800 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🎬</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Daily Remix</h3>
                  <p className="text-blue-100 text-sm">Curated daily prompts with your profile picture</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold">$0.50</div>
                <div className="text-blue-100 text-xs">USDC</div>
              </div>
            </div>
          </button>

          <button
            onClick={handleCustomRemix}
            disabled={!isConnected || !user}
            title={!isConnected ? 'Connect your wallet' : !user ? 'Connected account does not have an associated Farcaster account' : ''}
            className={`w-full group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 ${
              !isConnected || !user
                ? 'bg-slate-400 dark:bg-slate-800 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">✨</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Custom Remix</h3>
                  <p className="text-purple-100 text-sm">Your prompt with your profile picture</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold">$1.00</div>
                <div className="text-purple-100 text-xs">USDC</div>
              </div>
            </div>
          </button>

          <button
            onClick={handleCustomVideo}
            disabled={!isConnected}
            title={!isConnected ? 'Connect your wallet' : ''}
            className={`w-full group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 ${
              !isConnected
                ? 'bg-slate-400 dark:bg-slate-800 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🎥</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Custom Video</h3>
                  <p className="text-emerald-100 text-sm">Your prompt with any image</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold">$1.00</div>
                <div className="text-emerald-100 text-xs">USDC</div>
              </div>
            </div>
          </button>
        </div>
      )}

      {/** TODO: Re-add notification registration */}
      {/* Add Mini App for Notifications */}
      {/*
      {isConnected && 
       farcasterUser && 
       isInMiniApp &&
       !isNotificationEnrolled && 
       !checkingNotificationStatus &&
       generationType === null && 
       generationStatus === 'idle' && (
        <div className="text-center py-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">
              Get Daily Remix Notifications! 🔔
            </h4>
            <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
              Receive notifications when new daily remixes are available.
            </p>
            <button
              onClick={handleAddMiniApp}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
            >
              Add to Farcaster
            </button>
          </div>
        </div>
      )}

      {/** TODO: Re-add notification registration */}
      {/* Notification Status Loading */}
      {/* {isConnected && 
       farcasterUser && 
       isInMiniApp &&
       checkingNotificationStatus &&
       generationType === null && 
       generationStatus === 'idle' && (
        <div className="text-center py-4">
          <div className="bg-slate-50 dark:bg-slate-900/20 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-200 border-t-blue-600"></div>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Checking notification status...
              </span>
            </div>
          </div>
        </div>
      )} */}

      {/* Custom Remix Input */}
      {generationType === 'custom-remix' && generationStatus === 'idle' && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Custom Remix</h2>
            <p className="text-slate-600 dark:text-slate-300">
              Describe the video you want to remix with your profile picture
            </p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Transform my profile into a cyberpunk warrior with neon armor and a futuristic cityscape..."
              className="w-full p-4 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white resize-none h-32 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={resetFlow}
              className="flex-1 py-4 px-6 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-colors duration-200"
            >
              Back
            </button>
            <button
              onClick={handleCustomPromptSubmit}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              Generate ($1.00 USDC)
            </button>
        </div>
        </div>
      )}

      {/* Custom Video Input */}
      {generationType === 'custom-video' && generationStatus === 'idle' && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Custom Video</h2>
            <p className="text-slate-600 dark:text-slate-300">
              Remix any image into a video with your custom prompt
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
              The video generated will be 5 seconds long.
            </p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Image URL to Remix
              </label>
              <input
                type="url"
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full p-4 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Provide a direct URL to an image you want to remix
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Remix Prompt
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Transform this image into a majestic dragon soaring over a medieval castle at sunset with dramatic lighting..."
                className="w-full p-4 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white resize-none h-32 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={resetFlow}
              className="flex-1 py-4 px-6 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-colors duration-200"
            >
              Back
            </button>
            <button
              onClick={handleCustomPromptSubmit}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              Generate ($1.00 USDC)
            </button>
          </div>
        </div>
      )}

      {/* Generation Status */}
      {generationStatus === 'generating' && (
        <div className="text-center py-12">
          <div className="relative">
            <div className="w-16 h-16 mx-auto mb-6">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 text-blue-600">
                <Image src="/remix-logo.png" alt="Remix Logo" width={32} height={32} className="w-8 h-8" unoptimized />
              </div>
            </div>
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            Creating your remix...
          </h3>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            This typically takes 2-3 minutes
          </p>
          <div className="max-w-md mx-auto p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <strong>Please don&apos;t leave this page</strong> while your video is being generated.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generated Video Display */}
      {generatedVideo && generationStatus === 'success' && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Your Remix is Ready! 🎉
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              Share your creation with the world
            </p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
            <video 
              src={generatedVideo} 
              className="w-full rounded-xl shadow-lg"
              controls
              poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3Crect width='16' height='9' fill='%23f1f5f9'/%3E%3C/svg%3E"
            ></video>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ZoraCoinButton
              videoIpfs={ipfsUrl as string}
              address={address as string}
              chainId={chainId as number}
              remixId={remixId || undefined}
              isMinted={false}
              defaultName={
                user?.displayName
                  ? `${user.displayName} PFP Remix`
                  : user?.username
                  ? `${user.username} PFP Remix`
                  : 'Remix PFP Coin'
              }
              defaultSymbol={
                user?.displayName
                  ? getRemixSymbol(user.displayName)
                  : user?.username
                  ? getRemixSymbol(user.username)
                  : 'RMXR'
              }
              defaultDescription={
                user?.displayName
                  ? `${user.displayName} remix on ${getTodayString()}`
                  : user?.username
                  ? `${user.username} remix on ${getTodayString()}`
                  : `Remix on ${getTodayString()}`
              }
              onMintComplete={handleMintComplete}
            />
            <ShareOnFarcaster
              videoUrl={ipfsUrl ? `https://gateway.pinata.cloud/ipfs/${ipfsUrl.replace('ipfs://', '')}` : ''}
              ipfsUrl={ipfsUrl ? `https://gateway.pinata.cloud/ipfs/${ipfsUrl.replace('ipfs://', '')}` : ''}
            />
            <button 
              onClick={resetFlow}
              className="py-4 px-6 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-colors duration-200"
            >
              Create Another
            </button>
        </div>
        </div>
      )}
    </>
  );

  const renderHistoryTab = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Your History</h2>
        <p className="text-slate-600 dark:text-slate-300">
          All your generated videos with remix metadata
        </p>
      </div>

      {!isConnected ? (
        <div className="text-center py-12">
          <p className="text-slate-600 dark:text-slate-300">Please connect your wallet to view your history</p>
        </div>
      ) : loadingVideos ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Loading your history...</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-600 dark:text-slate-300">No videos found. Create your first video!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <RemixCard 
              key={video.id} 
              video={video} 
              address={address}
              chainId={chainId}
              onRefresh={fetchVideos}
            />
          ))}
        </div>
      )}
    </div>
  );

  const renderPendingTab = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Pending Jobs</h2>
        <p className="text-slate-600 dark:text-slate-300">
          These jobs are currently being processed. They will appear in your history when complete.
        </p>
      </div>
      {loadingPending ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Loading your pending jobs...</p>
        </div>
      ) : pendingJobs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-600 dark:text-slate-300">No pending jobs. Submit a new video to see it here!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {pendingJobs.map((job) => (
            <div key={job.id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{job.id.slice(0, 8)}...</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(job.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white capitalize">{job.type.replace('-', ' ')}</span>
                <span className={`text-xs px-2 py-1 rounded-lg font-semibold ${
                  job.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                  job.status === 'processing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' :
                  job.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                  'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                }`}>
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </span>
              </div>
              {job.prompt && (
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  <span className="font-semibold">Prompt:</span> {job.prompt}
                </div>
              )}
              {job.errorMessage && (
                <div className="text-xs text-red-600 dark:text-red-400">
                  <span className="font-semibold">Error:</span> {job.errorMessage}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center space-x-1">
                <div className="w-8 h-8 text-blue-600 dark:text-blue-400">
                  <Image src="/remix-logo.png" alt="Remix Logo" width={32} height={32} className="w-8 h-8" unoptimized />
                </div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Remix Me</h1>
              </div>
              <div className="flex items-center justify-center space-x-1 ml-1 text-sm text-slate-500 dark:text-slate-400">
                <span>Powered by</span>
                <a 
                  href="https://www.x402.org/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors duration-200"
                >
                  x402
                </a>
                <a 
                  href="https://github.com/coinbase/x402" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Farcaster User Info */}
              {isConnected && user && (
                <div className="hidden sm:flex items-center space-x-3 bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2">
                  <Image 
                    src={user.pfpUrl || ''} 
                    alt={user.displayName || ''}
                    className="w-6 h-6 rounded-full ring-2 ring-white dark:ring-slate-700"
                    width={24}
                    height={24}
                  />
                  <div className="text-xs">
                    <div className="font-medium text-slate-900 dark:text-white truncate max-w-24">
                      {user.displayName}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      @{user.username}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex-shrink-0">
                <Wallet />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-4xl mx-auto">
        <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'home'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Create
          </button>
          {pendingJobs.length > 0 && (
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'pending'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Pending ({pendingJobs.length})
            </button>
          )}
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'history'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            History
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-2 py-2">
        <div className="max-w-2xl mx-auto">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
}

// Helper to get initials for symbol
function getRemixSymbol(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    // One word: first 3 letters + R
    return (words[0].slice(0, 2) + 'R').toUpperCase();
  }
  // Multi-word: initials + R
  return (
    words.map(w => w[0]).join('') + 'R'
  ).toUpperCase();
}

// Helper to get today's date in readable format
function getTodayString() {
  return new Date().toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}
