# Mini App Testing Guide

This guide explains how to test your Remix app as a **Farcaster Mini App**, which works in both **Farcaster clients** (like Warpcast) and **Coinbase Wallet**.

## 🎯 What are Farcaster Mini Apps?

Farcaster Mini Apps are web applications that can be embedded and run within Farcaster clients like Warpcast and Coinbase Wallet. They use a standardized manifest format (`farcaster.json`) and provide a seamless user experience across different platforms.

**Key Points:**
- ✅ **Same app works everywhere** - Farcaster, Warpcast, Coinbase Wallet
- ✅ **Uses OnchainKit** for wallet integration and payments
- ✅ **Follows Farcaster Mini App specification**
- ✅ **Manifest file** (`farcaster.json`) defines app metadata

## 📱 How to Test Your Mini App

### Step 1: Deploy Your App
```bash
# Deploy to Vercel
vercel --prod

# Or deploy to your preferred platform
```

### Step 2: Test URL Preview
1. **Copy your deployed URL** (e.g., `https://remix-miniapp.vercel.app`)
2. **Post it on Farcaster/Warpcast**
3. **Check if it shows as a rich preview** with your app icon and description

### Step 3: Test Mini App Functionality
1. **If it previews as a mini app**: Great! Your setup is working
2. **If it shows as a regular link**: You need additional configuration

## 🔧 Your Current Setup

### ✅ What's Configured:
1. **Farcaster Manifest** (`/public/farcaster.json`)
   - App name, description, and metadata
   - Icon and splash screen configuration
   - Category and tags for discovery
   - Open Graph data for sharing

2. **OnchainKit Integration**
   - Wallet connection component
   - x402 payment integration
   - Base network support

3. **Mobile-Optimized Design**
   - Responsive layout
   - Touch-friendly interface
   - Proper viewport configuration

4. **Farcaster Integration**
   - User profile fetching
   - Profile picture integration
   - Farcaster ID handling

### 📋 Manifest Configuration:
Your `farcaster.json` includes:
- **App Name**: "Remix"
- **Category**: "entertainment"
- **Tags**: ai, video, farcaster, nft, base
- **Description**: AI video generation with x402 payments
- **Icon & Images**: Using your remix-logo.png

## 🧪 Testing Methods

### Method 1: Direct URL Testing
1. Deploy your app to production
2. Post the URL on Farcaster/Warpcast
3. Check if it previews as a mini app

### Method 2: Coinbase Wallet Testing
1. Open Coinbase Wallet mobile app
2. Go to "Discover" or "Apps" section
3. Search for "Remix" (if approved)
4. Test wallet connection and payment flows

### Method 3: PWA Testing
1. Open your app in mobile browser
2. Look for "Add to Home Screen" option
3. Install as a PWA
4. Test functionality in PWA mode

## 🎯 What to Expect

### ✅ Working Mini App:
- Rich preview with app icon and description
- Clickable interface within Farcaster/Coinbase Wallet
- Proper mobile layout
- Wallet integration works
- Payment flows function correctly

### ❌ Regular Link:
- Shows as a basic URL preview
- Opens in external browser
- No mini app functionality

## 📋 Requirements Checklist

### Technical Requirements:
- ✅ **HTTPS deployment** (required for mini apps)
- ✅ **Farcaster manifest** (`farcaster.json`)
- ✅ **OnchainKit integration**
- ✅ **Mobile-responsive design**
- ✅ **Wallet authentication**
- ✅ **x402 payment integration**

### Content Requirements:
- ✅ **App icon** (1024x1024 PNG)
- ✅ **Splash screen** (matching your app)
- ✅ **Screenshots** (3 screenshots, 1284x2778)
- ✅ **Description** (170 characters max)
- ✅ **Category** (entertainment)
- ✅ **Tags** (3-5 relevant tags)

## 🚀 Next Steps

### For Immediate Testing:
1. **Deploy your app** to production
2. **Test the URL** on Farcaster/Warpcast
3. **Check preview behavior**

### For Official Listing:
1. **Submit to Farcaster** for mini app approval
2. **Wait for review** (can take days/weeks)
3. **Get listed** in Farcaster's mini app directory

### For Coinbase Wallet:
1. **Submit to Coinbase Wallet** for review
2. **Wait for approval**
3. **Get listed** in Coinbase Wallet's app directory

## 🔍 Troubleshooting

### Common Issues:

1. **App doesn't preview as mini app**:
   - Check `farcaster.json` is accessible at `/farcaster.json`
   - Verify all required fields are present
   - Ensure HTTPS is enabled

2. **Wallet connection fails**:
   - Check OnchainKit configuration
   - Verify API keys are set
   - Test in different environments

3. **Payment flow issues**:
   - Verify x402 configuration
   - Check network settings
   - Test with testnet first

### Debug Steps:
1. **Check browser console** for errors
2. **Verify farcaster.json** is loading correctly
3. **Test meta tags** with social media debuggers
4. **Check mobile responsiveness**
5. **Verify HTTPS certificates**

## 📚 Resources

- [Base Mini Apps Documentation](https://docs.base.org/wallet-app/introduction/mini-apps)
- [OnchainKit Documentation](https://onchainkit.xyz)
- [Farcaster Mini App Specification](https://docs.farcaster.xyz)
- [x402 Documentation](https://docs.base.org/wallet-app/introduction/getting-started)

## 🎯 Summary

Your app is now properly configured as a **Farcaster Mini App** that will work in:
- ✅ **Farcaster clients** (Warpcast, etc.)
- ✅ **Coinbase Wallet**
- ✅ **Other Farcaster-compatible clients**

**To test:**
1. Deploy to production
2. Post URL on Farcaster
3. Check if it previews as a mini app
4. If not, submit for official approval

The app should work seamlessly across all Farcaster-compatible platforms once properly deployed and approved. 