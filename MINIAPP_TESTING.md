# Farcaster Mini App Testing Guide

This guide explains how to test your Remix app as a **Farcaster Mini App** using the official Farcaster Mini App specification.

## 🎯 What are Farcaster Mini Apps?

Farcaster Mini Apps are web applications that can be discovered and used within Farcaster clients. They use a standardized embed format that allows any page to be rendered as a rich object in social feeds, with a button that launches users into the application.

**Key Points:**
- ✅ **Embed-based discovery** - Apps are discovered through social feeds
- ✅ **Rich previews** - Show image and button in feeds
- ✅ **Seamless launch** - Click button to open the Mini App
- ✅ **SDK integration** - Access native Farcaster features

## 📱 How Farcaster Mini Apps Work

### Mini App Embed
The primary discovery point for Mini Apps are social feeds. Mini App Embeds use an OpenGraph-inspired metadata standard that lets any page be rendered as a rich object with a button underneath.

### Embed Format
Your app must include a `fc:frame` meta tag with serialized JSON containing:
- **version**: "next" (current version)
- **imageUrl**: Image for the embed (3:2 aspect ratio, max 1024 characters)
- **button**: Button configuration with action

### App Surface
When launched, Mini Apps are rendered in a vertical modal with:
- **Header**: Shows app name and author
- **Splash Screen**: Shows during loading (200x200px image)
- **App Content**: Your actual application (424x695px on web, device dimensions on mobile)

## 🔧 Your Current Setup

### ✅ What's Configured:
1. **Farcaster Embed Meta Tag** (`fc:frame`)
   - Properly serialized JSON in HTML head
   - Includes version, image, and button configuration
   - Follows official specification constraints

2. **Farcaster Frame SDK Integration**
   - SDK installed and initialized
   - Context detection and ready signal
   - Proper Mini App lifecycle handling

3. **OnchainKit Integration**
   - Wallet connection component
   - x402 payment integration
   - Base network support

4. **Mobile-Optimized Design**
   - Responsive layout for Mini App modal
   - Touch-friendly interface
   - Proper viewport configuration

5. **Performance Optimization**
   - Preconnect hint for Quick Auth Server
   - Optimized loading experience

### 📋 Embed Configuration:
Your `fc:frame` meta tag includes:
- **Version**: "next"
- **Image**: Your remix-logo.png (3:2 aspect ratio)
- **Button Title**: "🎬 Remix" (max 32 characters)
- **Action**: launch_frame to your app URL
- **Splash Screen**: Logo with blue background
- **Splash Image**: Should be 200x200px (currently using existing logo)

## 🧪 Testing Your Mini App

### Step 1: Deploy Your App
```bash
# Deploy to Vercel
vercel --prod

# Or deploy to your preferred platform
```

### Step 2: Test Embed Preview
1. **Copy your deployed URL** (e.g., `https://remix-x402-miniapp-demo.vercel.app/`)
2. **Post it on Farcaster/Warpcast**
3. **Check if it shows as a rich embed** with:
   - Your app image (3:2 ratio)
   - "🎬 Remix" button underneath
   - Proper preview formatting

### Step 3: Test Mini App Launch
1. **Click the button** in the embed
2. **Verify splash screen** appears (with your logo)
3. **Check app loads** in Mini App modal (424x695px on web)
4. **Test functionality** (wallet connection, payments, etc.)

## 🎯 What to Expect

### ✅ Working Mini App Embed:
- Rich preview with your app image (3:2 ratio)
- "🎬 Remix" button underneath (max 32 chars)
- Clicking button opens Mini App
- Splash screen shows during loading
- App renders in vertical modal (424x695px web, device size mobile)
- All functionality works (wallet, payments, etc.)

### ❌ Regular Link:
- Shows as basic URL preview
- No button or rich formatting
- Opens in external browser
- No Mini App functionality

## 📋 Requirements Checklist

### Technical Requirements:
- ✅ **HTTPS deployment** (required for Mini Apps)
- ✅ **fc:frame meta tag** with proper JSON (max 1024 chars)
- ✅ **Farcaster Frame SDK** integration
- ✅ **Mobile-responsive design**
- ✅ **Wallet authentication**
- ✅ **x402 payment integration**

### Content Requirements:
- ✅ **Embed image** (3:2 aspect ratio, max 1024 chars)
- ✅ **Button title** (max 32 characters)
- ⚠️ **Splash screen** (200x200px image - needs optimization)
- ✅ **App functionality** (wallet, payments, etc.)

## 🚀 Next Steps

### For Immediate Testing:
1. **Deploy your app** to production
2. **Test the URL** on Farcaster/Warpcast
3. **Check embed preview** and button functionality
4. **Test Mini App launch** and functionality

### For Official Discovery:
1. **Submit to Farcaster** for Mini App approval
2. **Wait for review** (can take days/weeks)
3. **Get listed** in Farcaster's Mini App directory

### For Optimization:
1. **Create 200x200px splash image** for better compliance
2. **Test on different devices** (mobile vs web)
3. **Optimize loading performance**

## 🔍 Troubleshooting

### Common Issues:

1. **No rich embed preview**:
   - Check `fc:frame` meta tag is present
   - Verify JSON is properly serialized (max 1024 chars)
   - Ensure image URL is accessible
   - Check image aspect ratio (3:2)

2. **Button doesn't work**:
   - Verify action URL is correct
   - Check splash screen configuration
   - Ensure app loads properly

3. **Mini App doesn't load**:
   - Check SDK initialization
   - Verify ready() signal is sent
   - Check console for errors

4. **Splash screen issues**:
   - Ensure splash image is 200x200px
   - Check splash background color is valid hex
   - Verify image URL is accessible

### Debug Steps:
1. **Check browser console** for errors
2. **Verify fc:frame meta tag** is present
3. **Test image URL** accessibility
4. **Check SDK context** detection
5. **Verify HTTPS certificates**
6. **Test on different devices** (mobile vs web)

## 📚 Resources

- [Farcaster Mini Apps Documentation](https://miniapps.farcaster.xyz/docs/getting-started)
- [Farcaster Frame SDK](https://miniapps.farcaster.xyz/docs/sdk)
- [Mini App Specification](https://miniapps.farcaster.xyz/docs/specification)
- [OnchainKit Documentation](https://onchainkit.xyz)

## 🎯 Summary

Your app is now properly configured as a **Farcaster Mini App** following the official specification:

**Key Features:**
- ✅ **Rich embed preview** in social feeds (3:2 ratio)
- ✅ **One-click launch** into Mini App
- ✅ **Splash screen** during loading
- ✅ **SDK integration** for native features
- ✅ **Wallet and payment** functionality
- ✅ **Performance optimization** with preconnect

**To test:**
1. Deploy to production
2. Post URL on Farcaster
3. Check for rich embed with button
4. Click button to launch Mini App
5. Test all functionality

**Optimization needed:**
- Create 200x200px splash image for full compliance

The app should now work as a proper Farcaster Mini App that can be discovered through social feeds and launched seamlessly within Farcaster clients. 