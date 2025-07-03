import React, { useState, useEffect, useCallback } from 'react';
import { cleanAndValidateMetadataURI, createCoinCall, DeployCurrency, ValidMetadataURI } from '@zoralabs/coins-sdk';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import toast from 'react-hot-toast';
import { base } from 'viem/chains';

interface ZoraCoinButtonProps {
  videoIpfs: string;
  address: string;
  chainId: number;
  remixId?: string;
  defaultName?: string;
  defaultSymbol?: string;
  defaultDescription?: string;
  isMinted?: boolean;
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
  } | null
  onSuccess?: (tx: unknown) => void;
  onError?: (err: unknown) => void;
  onMintComplete?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function ZoraCoinButton({
  videoIpfs,
  address,
  chainId,
  remixId,
  defaultName = '',
  defaultSymbol = '',
  defaultDescription = '',
  isMinted = false,
  zoraCoinData,
  onSuccess,
  onError,
  onMintComplete,
  className = '',
  children,
}: ZoraCoinButtonProps) {
  const { writeContractAsync, isPending } = useWriteContract();
  const [showModal, setShowModal] = useState(false);
  const [coinName, setCoinName] = useState(defaultName);
  const [coinSymbol, setCoinSymbol] = useState(defaultSymbol);
  const [coinDescription, setCoinDescription] = useState(defaultDescription);
  const [coinCurrency, setCoinCurrency] = useState<'ZORA' | 'ETH'>('ZORA');
  const [pinningState, setPinningState] = useState<'idle' | 'pinning' | 'pinned' | 'error'>('idle');
  const [pinError, setPinError] = useState<string | null>(null);
  const [metadataUri, setMetadataUri] = useState<string | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [localIsMinted, setLocalIsMinted] = useState(isMinted);
  const [showManualInstructions, setShowManualInstructions] = useState(false);

  useEffect(() => {
    setLocalIsMinted(isMinted);
  }, [isMinted]);

  const { data: receipt, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}` | undefined,
  });

  const updateDatabaseWithCoinData = useCallback(async () => {
    console.log('🔵 ZoraCoinButton: updateDatabaseWithCoinData called', {
      remixId,
      metadataUri,
      contractAddress: receipt?.contractAddress,
      coinName,
      coinSymbol,
      address,
      chainId,
      coinCurrency,
      txHash
    });
    
    if (!remixId || !metadataUri || !receipt?.contractAddress) {
      console.error('🔴 ZoraCoinButton: Missing required data for database update', {
        remixId: !!remixId,
        metadataUri: !!metadataUri,
        contractAddress: !!receipt?.contractAddress
      });
      return;
    }
    
    try {
      const requestBody = {
        remixId,
        name: coinName,
        symbol: coinSymbol,
        uri: metadataUri,
        payoutRecipient: address,
        chainId: chainId.toString(),
        currency: coinCurrency,
        owner: address,
        txHash: txHash,
        contractAddress: receipt.contractAddress,
      };
      
      console.log('🔵 ZoraCoinButton: Sending database update request:', requestBody);
      
      const response = await fetch('/api/zora', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('🔵 ZoraCoinButton: Database update response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔴 ZoraCoinButton: Failed to update database with coin data:', errorText);
      } else {
        const responseData = await response.json();
        console.log('🔵 ZoraCoinButton: Successfully updated database with coin data:', responseData);
      }
    } catch (error) {
      console.error('🔴 ZoraCoinButton: Error updating database with coin data:', error);
    }
  }, [remixId, metadataUri, receipt?.contractAddress, address, coinName, coinSymbol, chainId, coinCurrency, txHash]);

  useEffect(() => {
    if (isTxSuccess && receipt?.contractAddress && address && remixId && metadataUri) {
      updateDatabaseWithCoinData();
      onMintComplete?.();
    }
  }, [receipt, updateDatabaseWithCoinData, isTxSuccess, receipt?.contractAddress, address, remixId, metadataUri, onMintComplete]);

  const isDisabled = !videoIpfs || !address || !chainId || localIsMinted;

  const openModal = () => {
    console.log('🔵 ZoraCoinButton: openModal called', { 
      localIsMinted, 
      zoraCoinData, 
      videoIpfs, 
      address, 
      chainId 
    });
    
    if (localIsMinted) {
      console.log('🔵 ZoraCoinButton: Already minted, opening Zora URL');
      if (zoraCoinData?.contractAddress) {
        const referrer = process.env.NEXT_PUBLIC_RESOURCE_WALLET_ADDRESS || address;
        const zoraUrl = `https://zora.co/coin/base:${zoraCoinData.contractAddress}?referrer=${referrer}`;
        console.log('🔵 ZoraCoinButton: Opening Zora URL:', zoraUrl);
        window.open(zoraUrl, '_blank');
      }
      return;
    }

    console.log('🔵 ZoraCoinButton: Opening modal with defaults', { 
      defaultName, 
      defaultSymbol, 
      defaultDescription 
    });
    
    setCoinName(defaultName);
    setCoinSymbol(defaultSymbol);
    setCoinDescription(defaultDescription);
    setShowModal(true);
    setPinningState('idle');
    setPinError(null);
    setMetadataUri(null);
    setMintError(null);
    setShowManualInstructions(false);
  };

  const handlePinAndFetchMetadata = async () => {
    console.log('🔵 ZoraCoinButton: handlePinAndFetchMetadata called', {
      coinName,
      coinDescription,
      videoIpfs,
      address
    });
    
    setPinningState('pinning');
    setPinError(null);
    setMetadataUri(null);
    
    try {
      const params = new URLSearchParams({
        name: coinName,
        description: coinDescription,
        videoIpfs,
        walletAddress: address,
      });
      
      const apiUrl = `/api/zora?${params.toString()}`;
      console.log('🔵 ZoraCoinButton: Calling Zora API:', apiUrl);
      
      const res = await fetch(apiUrl);
      console.log('🔵 ZoraCoinButton: API response status:', res.status);
      
      if (!res.ok) {
        const err = await res.text();
        console.error('🔴 ZoraCoinButton: API error response:', err);
        throw new Error(err || 'Failed to create Zora metadata');
      }
      
      const responseData = await res.json();
      console.log('🔵 ZoraCoinButton: API response data:', responseData);
      
      const { uri } = responseData;
      console.log('🔵 ZoraCoinButton: Setting metadata URI:', uri);
      
      setMetadataUri(uri);
      setPinningState('pinned');
    } catch (err: unknown) {
      console.error('🔴 ZoraCoinButton: Error in handlePinAndFetchMetadata:', err);
      setPinError((err as Error)?.message || 'Failed to pin to IPFS');
      setPinningState('error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔵 ZoraCoinButton: handleSubmit called', {
      coinName,
      coinSymbol,
      metadataUri,
      address,
      coinCurrency
    });
    
    setMintError(null);
    
    if (!coinName || !coinSymbol || !metadataUri) {
      console.error('🔴 ZoraCoinButton: Missing required fields', { coinName, coinSymbol, metadataUri });
      return;
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      console.error('🔴 ZoraCoinButton: Invalid payout address:', address);
      setMintError('Invalid payout address');
      return;
    }
    
    try {
      console.log('🔵 ZoraCoinButton: Creating coin call parameters...');
      
      const deployContractParams = await createCoinCall({
        name: coinName,
        symbol: coinSymbol,
        uri: cleanAndValidateMetadataURI(metadataUri as ValidMetadataURI) as ValidMetadataURI,
        owners: [address as `0x${string}`],
        payoutRecipient: address as `0x${string}`,
        currency: coinCurrency === 'ZORA' ? DeployCurrency.ZORA : DeployCurrency.ETH,
        chainId: base.id,
        platformReferrer: process.env.NEXT_PUBLIC_RESOURCE_WALLET_ADDRESS as `0x${string}`,
      });
      
      console.log('🔵 ZoraCoinButton: Deploy contract params:', deployContractParams);
      console.log('🔵 ZoraCoinButton: Platform referrer:', process.env.NEXT_PUBLIC_RESOURCE_WALLET_ADDRESS);
      
      console.log('🔵 ZoraCoinButton: Calling writeContractAsync...');
      const tx = await writeContractAsync(deployContractParams);
      console.log('🔵 ZoraCoinButton: Transaction hash received:', tx);
      
      setTxHash(tx);
      setShowModal(false);
      onSuccess?.(tx);

      toast.success(`${coinName} coin minted successfully! 🪙`, {
        duration: 5000,
      });

      toast.success('Transaction submitted! Check your wallet for confirmation.', {
        duration: 4000,
      });
      
    } catch (err: unknown) {
      console.error('🔴 ZoraCoinButton: Error in handleSubmit:', err);
      console.error('🔴 ZoraCoinButton: Error details:', {
        message: (err as Error)?.message,
        stack: (err as Error)?.stack,
        name: (err as Error)?.name
      });
      
      setMintError((err as Error)?.message || 'Failed to mint coin');
      onError?.(err);
      toast.error('Failed to mint coin. Please try again.');
    }
  };

  function getRemixSymbol(name: string) {
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return (words[0].slice(0, 2) + 'R').toUpperCase();
    }
    return (
      words.map(w => w[0]).join('') + 'R'
    ).toUpperCase();
  }

  if (localIsMinted && zoraCoinData?.contractAddress) {
    return (
      <button
        onClick={openModal}
        className={`py-4 px-6 rounded-xl font-semibold text-white shadow-lg transition-all duration-200 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:shadow-xl transform hover:-translate-y-0.5 ${className}`}
      >
        {children || '🪙 View on Zora'}
      </button>
    );
  }

  return (
    <>
      <button
        disabled={isDisabled}
        className={children ? className : `py-4 px-6 rounded-xl font-semibold text-white shadow-lg transition-all duration-200 ${
          isDisabled
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:shadow-xl transform hover:-translate-y-0.5'
        } ${className}`}
        onClick={openModal}
      >
        {children || '🪙 Coin on Zora'}
      </button>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-fade-in">
            <button
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white text-2xl"
              onClick={() => setShowModal(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Coin on Zora</h2>
            
            {/* Experimental Feature Warning */}
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
              <div className="flex items-start space-x-2">
                <span className="text-amber-600 dark:text-amber-400 text-lg">⚠️</span>
                <div className="text-sm">
                  <div className="font-semibold text-amber-800 dark:text-amber-300 mb-1">Experimental Feature</div>
                  <div className="text-amber-700 dark:text-amber-400">
                    This automated coin creation is experimental. If it doesn&apos;t work, you can manually create your coin on Zora.
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowManualInstructions(!showManualInstructions)}
                    className="mt-2 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-medium underline"
                  >
                    {showManualInstructions ? 'Show Form' : 'Show Manual Instructions'}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Manual Instructions */}
            {showManualInstructions && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <div className="text-sm">
                  <div className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Manual Coin Creation Steps:</div>
                  <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-400">
                    <li>Go to <a href="https://zora.co/coin" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900 dark:hover:text-blue-200">zora.co/coin</a></li>
                    <li>Connect your wallet</li>
                    <li>Fill in your coin details:
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        <li><strong>Name:</strong> Your coin name</li>
                        <li><strong>Symbol:</strong> Your coin symbol (3-6 characters)</li>
                        <li><strong>Description:</strong> Describe your coin</li>
                        <li><strong>Image:</strong> Upload your video or image</li>
                      </ul>
                    </li>
                    <li>Set your payout recipient (your wallet address)</li>
                    <li>Choose your currency (ZORA or ETH)</li>
                    <li>Deploy your coin</li>
                  </ol>
                  <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                    💡 Tip: You can use your video IPFS URL: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{videoIpfs}</code>
                    {coinName && (
                      <div className="mt-1">
                        📝 Suggested values: Name: &quot;{coinName}&quot;, Symbol: &quot;{coinSymbol}&quot;
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Form - only show when manual instructions are hidden */}
            {!showManualInstructions && pinningState === 'idle' && (
              <form onSubmit={async e => {
                e.preventDefault();
                await handlePinAndFetchMetadata();
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Coin Name</label>
                  <input
                    type="text"
                    value={coinName}
                    onChange={e => {
                      setCoinName(e.target.value);
                      setCoinSymbol(getRemixSymbol(e.target.value));
                    }}
                    className="input-field"
                    placeholder="My Awesome Coin"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Symbol</label>
                  <input
                    type="text"
                    value={coinSymbol}
                    onChange={e => setCoinSymbol(e.target.value.toUpperCase())}
                    className="input-field"
                    placeholder="MAC"
                    maxLength={6}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Description <span className="text-slate-400">(optional)</span></label>
                  <textarea
                    value={coinDescription}
                    onChange={e => setCoinDescription(e.target.value)}
                    className="input-field h-20 resize-none"
                    placeholder="Describe your coin..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Currency</label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      className={`flex-1 py-2 rounded-lg font-semibold border transition-colors duration-150 ${coinCurrency === 'ZORA' ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white border-transparent' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'}`}
                      onClick={() => setCoinCurrency('ZORA')}
                    >
                      ZORA
                    </button>
                    <button
                      type="button"
                      className={`flex-1 py-2 rounded-lg font-semibold border transition-colors duration-150 ${coinCurrency === 'ETH' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-transparent' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'}`}
                      onClick={() => setCoinCurrency('ETH')}
                    >
                      ETH
                    </button>
                  </div>
                </div>
                {pinError && (
                  <div className="mb-2 p-2 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
                    {pinError}
                  </div>
                )}
                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    className="btn-secondary flex-1"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                  >
                    Prepare for Minting
                  </button>
                </div>
              </form>
            )}
            
            {/* Other states - only show when manual instructions are hidden */}
            {!showManualInstructions && (
              <>
                {pinningState === 'pinning' && (
                  <div className="flex flex-col items-center justify-center py-6">
                    <div className="spinner w-10 h-10 mb-4" />
                    <div className="text-slate-700 dark:text-slate-200 font-medium">Uploading to IPFS via Pinata...</div>
                  </div>
                )}
                {pinningState === 'error' && (
                  <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
                    <div className="font-medium">{pinError}</div>
                    <button
                      className="mt-2 btn-secondary"
                      onClick={handlePinAndFetchMetadata}
                    >
                      Retry Pinning
                    </button>
                  </div>
                )}
                {pinningState === 'pinned' && metadataUri && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="mb-2 p-2 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg text-green-700 dark:text-green-400">
                      Metadata pinned to IPFS!
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Metadata URI</label>
                      <input
                        type="text"
                        value={metadataUri}
                        className="input-field"
                        readOnly
                      />
                    </div>
                    {mintError && (
                      <div className="mb-2 p-2 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
                        {mintError}
                      </div>
                    )}
                    <div className="flex space-x-4 pt-4">
                      <button
                        type="button"
                        className="btn-secondary flex-1"
                        onClick={() => setShowModal(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-primary flex-1"
                        disabled={isPending}
                      >
                        {isPending ? 'Minting...' : 'Create Coin'}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
 