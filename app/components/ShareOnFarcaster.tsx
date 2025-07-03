import { Share2, Download } from 'lucide-react';
import { useState } from 'react';

interface ShareOnFarcasterProps {
  videoUrl?: string; // Original video URL (fallback, expires after 7 days)
  ipfsUrl?: string;  // IPFS URL (preferred for permanent storage and downloads)
  className?: string;
  iconOnly?: boolean; // Show only icon instead of text
}

export function ShareOnFarcaster({ videoUrl, ipfsUrl, className = "", iconOnly = false }: ShareOnFarcasterProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleDirectShare = () => {
    // Share the video URL directly (will show as link, not embedded video)
    // Prioritize ipfsUrl over videoUrl for permanent storage
    const shareUrl = ipfsUrl || videoUrl;
    
    if (!shareUrl) {
      console.error('No video URL available for sharing');
      return;
    }

    const text = encodeURIComponent("Check out my AI remix video! 🎬 Made with Remix Mini App.\n" + shareUrl);
    const url = `https://warpcast.com/~/compose?text=${text}`;
    window.open(url, '_blank');
  };

  const handleDownloadAndShare = () => {
    // Provide instructions for downloading and sharing manually
    setShowInstructions(true);
  };

  const downloadVideo = async () => {
    // Always prioritize IPFS URL for downloads since videoUrl expires after 7 days
    const shareUrl = ipfsUrl || videoUrl;
    if (!shareUrl) return;

    try {
      const response = await fetch(shareUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'remix-video.mp4';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download video:', error);
      // Fallback: open in new tab
      window.open(shareUrl, '_blank');
    }
  };

  const handleShowOptions = () => {
    setShowOptions(!showOptions);
    setShowInstructions(false);
  };

  return (
    <div className="relative">
      <button
        onClick={handleShowOptions}
        className={`text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 ${
          showOptions 
            ? 'bg-gradient-to-r from-purple-600 to-purple-700 shadow-inner' // Pressed state - same as hover
            : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl' // Normal state
        } ${className}`}
      >
        {iconOnly ? (
          <Share2 className="w-5 h-5" />
        ) : (
          <span>📱 Share on Farcaster</span>
        )}
      </button>

      {/* Share Options Modal */}
      {showOptions && (
        <div className="absolute bottom-full left-0 mb-0 ml-1 w-72 bg-white dark:bg-slate-800 rounded-r-xl rounded-t-xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 z-50">
          <div className="flex items-center justify-between mb-0">
            <button
              onClick={() => setShowOptions(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-0">
            <button
              onClick={handleDirectShare}
              className="w-full text-left p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-200 flex items-center space-x-3"
            >
              <Share2 className="w-4 h-4 text-blue-500" />
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">Share as Link</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Will show as URL, not embedded video</div>
              </div>
            </button>

            <button
              onClick={handleDownloadAndShare}
              className="w-full text-left p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-200 flex items-center space-x-3"
            >
              <Download className="w-4 h-4 text-green-500" />
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">Download & Upload</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Best option for video embeds</div>
              </div>
            </button>
          </div>

        </div>
      )}

      {/* Download Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Download & Share Instructions</h3>
              <button
                onClick={() => setShowInstructions(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-slate-900 dark:text-white">Step 1: Download Video</h4>
                <button
                  onClick={downloadVideo}
                  className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Video</span>
                </button>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-slate-900 dark:text-white">Step 2: Share on Farcaster</h4>
                <ol className="text-sm text-slate-600 dark:text-slate-300 space-y-1 list-decimal list-inside">
                  <li>Open Warpcast or your Farcaster client</li>
                  <li>Create a new post</li>
                  <li>Upload the downloaded video file</li>
                  <li>Add your caption and post!</li>
                </ol>
              </div>

              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="text-sm text-green-700 dark:text-green-300">
                  <strong>Why this works:</strong> Uploading directly to Farcaster ensures proper video embedding and playback!
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 