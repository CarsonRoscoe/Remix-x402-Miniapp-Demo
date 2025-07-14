'use client';

import { useState } from 'react';
import { ZoraCoinButton } from './ZoraCoinButton';
import { ShareOnFarcaster } from './ShareOnFarcaster';
import { Coins, FileText } from 'lucide-react';

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

interface RemixCardProps {
  video: Video;
  pfpUrl?: string;
  address?: string;
  chainId?: number;
  onRefresh?: () => void;
}

const getVideoTypeLabel = (video: Video) => {
  if (video.remix) {
    // Has remix metadata
    if (video.remix.promptId) {
      return 'Daily Remix';
    } else {
      return 'Custom Remix';
    }
  } else {
    // No remix metadata
    return 'Custom Video';
  }
};

const getVideoTitle = (video: Video) => {
  const date = new Date(video.createdAt).toLocaleDateString();
  
  if (video.remix?.zoraCoinData) {
    return `${video.remix.zoraCoinData.name} - ${date}`;
  } else if (video.remix?.prompt) {
    return `Daily Remix - ${date}`;
  } else if (video.remix) {
    return `Custom Remix - ${date}`;
  } else {
    return `Custom Video - ${date}`;
  }
};

export function RemixCard({ video, address, chainId, onRefresh, pfpUrl }: RemixCardProps) {
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  const isRemix = !!video.remix;
  const isMinted = video.remix?.isMinted;
  const hasZoraData = !!video.remix?.zoraCoinData;
  const isDailyRemix = !!video.remix?.promptId;
  const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${video.videoIpfs.replace('ipfs://', '')}`;

  // Callback to refresh data when minting is complete
  const handleMintComplete = () => {
    // Trigger a page refresh or data refetch
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-200">
        {/* Video Thumbnail */}
        <div className="relative mb-4 aspect-video bg-slate-100 dark:bg-slate-700 rounded-xl overflow-hidden cursor-pointer group" onClick={() => setShowVideoModal(true)}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </div>

        {/* Zora Coin Section */}
        {hasZoraData && video.remix?.zoraCoinData && (
          <div className="mb-4">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  if (!video.remix?.zoraCoinData) return;
                  const referrer = process.env.NEXT_PUBLIC_RESOURCE_WALLET_ADDRESS || address;
                  const zoraUrl = `https://zora.co/collect/${video.remix.zoraCoinData.contractAddress}?referrer=${referrer}`;
                  window.open(zoraUrl, '_blank');
                }}
                className="w-full py-3 px-4 rounded-xl font-semibold text-white shadow-lg transition-all duration-200 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center"
              >
                <Coins className="w-5 h-5" />
              </button>
              <ShareOnFarcaster
                videoUrl={ipfsUrl}
                ipfsUrl={ipfsUrl}
                className="w-full py-3 px-4 rounded-xl font-semibold text-white shadow-lg transition-all duration-200 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center"
                iconOnly={true}
              />
              {isDailyRemix && video.remix?.prompt && (
                <button
                  onClick={() => setShowPromptModal(true)}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-white shadow-lg transition-all duration-200 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center"
                >
                  <FileText className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Coin Button for Unminted Remixes */}
        {isRemix && !isMinted && address && chainId && (
          <div className="mb-4">
            <div className="grid grid-cols-3 gap-2">
              <ZoraCoinButton
                videoIpfs={video.videoIpfs}
                address={address}
                chainId={chainId}
                remixId={video.remix?.id}
                isMinted={isMinted}
                pfpUrl={pfpUrl}
                zoraCoinData={video.remix?.zoraCoinData}
                defaultName={isDailyRemix ? "Daily Remix Coin" : "Custom Remix Coin"}
                defaultSymbol={isDailyRemix ? "DRC" : "CRC"}
                defaultDescription={`${isDailyRemix ? "Daily" : "Custom"} remix coin created on ${new Date(video.createdAt).toLocaleDateString()}`}
                onMintComplete={handleMintComplete}
                className="w-full py-3 px-4 rounded-xl font-semibold text-white shadow-lg transition-all duration-200 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center"
              >
                <Coins className="w-5 h-5" />
              </ZoraCoinButton>
              <ShareOnFarcaster
                videoUrl={ipfsUrl}
                ipfsUrl={ipfsUrl}
                className="w-full py-3 px-4 rounded-xl font-semibold text-white shadow-lg transition-all duration-200 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center"
                iconOnly={true}
              />
              {isDailyRemix && video.remix?.prompt && (
                <button
                  onClick={() => setShowPromptModal(true)}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-white shadow-lg transition-all duration-200 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center"
                >
                  <FileText className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Type Badge */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {getVideoTypeLabel(video)}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {new Date(video.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Video Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                {getVideoTitle(video)}
              </h3>
              <button
                onClick={() => setShowVideoModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 p-6 overflow-hidden">
              <video 
                src={ipfsUrl || video.videoUrl}
                controls
                className="w-full h-full object-contain rounded-lg"
                autoPlay
                muted
              />
            </div>
          </div>
        </div>
      )}

      {/* Prompt Modal */}
      {showPromptModal && video.remix?.prompt && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                Daily Prompt
              </h3>
              <button
                onClick={() => setShowPromptModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed">
              {video.remix.prompt.prompt}
            </p>
            <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              {new Date(video.remix.prompt.date).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}
    </>
  );
} 