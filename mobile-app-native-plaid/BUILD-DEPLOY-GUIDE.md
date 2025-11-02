# PocketTrack Mobile App - Build & Deploy Guide

## 🚀 Complete Guide to Building with Native Plaid SDK

This guide will walk you through building and deploying your PocketTrack mobile app with the **native Plaid Link SDK** to TestFlight, which fixes the infinite loading screen issue.

---

## ⚠️ Prerequisites

Before you begin, make sure you have:

### 1. Development Environment
- **Node.js** (v18 or later): [Download here](https://nodejs.org/)
- **Expo CLI**: Install globally with `npm install -g expo-cli`
- **EAS CLI**: Install globally with `npm install -g eas-cli`

### 2. Accounts & Credentials
- **Expo Account**: [Sign up free](https://expo.dev/signup) if you don't have one
- **Apple Developer Account**: Required for TestFlight ($99/year)
- **Plaid Account**: You should already have this configured

### 3. Apple Developer Setup
- App Store Connect access
- Apple Developer Team ID
- iOS Distribution Certificate (EAS can generate this)

---

## 📋 Step 1: Download & Extract Mobile App

You have two options:

### Option A: Download from Replit
1. Download `pockettrack-mobile-native-plaid-FIXED.tar.gz` from your Replit
2. Extract it on your local machine:
   ```bash
   tar -xzf pockettrack-mobile-native-plaid-FIXED.tar.gz
   cd mobile-app-native-plaid
   ```

### Option B: Clone from Replit
If you have the mobile app in your Replit repo:
```bash
# On your local machine
git clone <your-replit-repo-url>
cd <repo-name>/mobile-app-native-plaid
```

---

## 📋 Step 2: Install Dependencies

```bash
# Install all dependencies including react-native-plaid-link-sdk
npm install

# Verify native Plaid SDK is installed
npm list react-native-plaid-link-sdk
```

**Expected output:**
```
react-native-plaid-link-sdk@11.11.0
```

---

## 📋 Step 3: Update App URL (IMPORTANT!)

Edit `App.js` and update line 10 with your actual PocketTrack URL:

```javascript
// BEFORE:
const POCKETTRACK_URL = 'https://pocket-track-mvp.replit.app/';

// AFTER (use your actual Replit URL):
const POCKETTRACK_URL = 'https://your-actual-repl-name.replit.app/';
```

💡 **Find your URL**: It's the URL shown in the Webview panel in Replit

---

## 📋 Step 4: Configure EAS Build

### First-Time EAS Setup

```bash
# Login to your Expo account
eas login

# Configure the project
eas build:configure
```

This will ask you:
- Select platform: **Choose iOS**
- Generate credentials automatically: **Yes** (if you don't have them)

### Update eas.json (Optional)

Open `eas.json` and update the production submit section with your Apple details:

```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "your-apple-team-id"
      }
    }
  }
}
```

---

## 📋 Step 5: Build for TestFlight

Now let's build! Choose one of these profiles:

### Option A: Preview Build (Recommended for Testing)
```bash
eas build --platform ios --profile preview
```

### Option B: Production Build
```bash
eas build --platform ios --profile production
```

**What happens:**
1. EAS uploads your code to their servers
2. They build the iOS app in the cloud
3. You'll get a download link when it's done (~15-20 minutes)

**During the build, you'll be asked:**
- Apple ID credentials (if not configured)
- Whether to generate certificates (say Yes)
- Team selection (choose your Apple Developer team)

---

## 📋 Step 6: Upload to TestFlight

### Automatic Upload (Easiest)
If you configured `eas.json` with your Apple credentials:
```bash
eas submit --platform ios --latest
```

### Manual Upload
1. Download the `.ipa` file from the EAS build link
2. Go to [App Store Connect](https://appstoreconnect.apple.com/)
3. Navigate to your app → TestFlight tab
4. Click "+" to add a new build
5. Upload the `.ipa` file

---

## 📋 Step 7: Configure Plaid Dashboard

**⚠️ CRITICAL STEP** - Without this, Plaid will still fail!

1. Go to [Plaid Dashboard](https://dashboard.plaid.com/team/api)
2. Navigate to **Settings → API → Allowed redirect URIs**
3. Add this redirect URI:
   ```
   pockettrack://plaid-redirect
   ```
4. Click **Save changes**

**Why this matters:**
- The native Plaid SDK uses deep linking
- iOS will redirect back to your app using this scheme
- Without it configured, Plaid authentication will fail

---

## 📋 Step 8: Test on TestFlight

1. **Install TestFlight** on your iOS device (if not already installed)
2. Check your email for **TestFlight invitation** (sent to your Apple ID)
3. **Accept the invitation** and install the app
4. **Launch PocketTrack** from your device
5. **Login** to your account
6. **Tap "Connect Bank"** button

### ✅ Expected Behavior (Success):
1. Native iOS Plaid Link opens immediately ✅
2. You see the bank selection screen ✅
3. No loading spinner at cdn.plaid.com ✅
4. You can search and select your bank ✅
5. Authentication completes ✅
6. App returns showing "Connected Banks" ✅

### ❌ If It Still Fails:

**Problem: Infinite loading screen still appears**
- You may be testing the old build
- Check TestFlight app version number (should be Build 2)
- Make sure you installed the NEW build, not the old one

**Problem: "Failed to connect bank"**
- Verify `pockettrack://plaid-redirect` is in Plaid Dashboard
- Check your Plaid credentials are correct (PLAID_CLIENT_ID, PLAID_SECRET)
- Make sure PLAID_ENV matches your credentials (sandbox vs production)

**Problem: App crashes when clicking "Connect Bank"**
- Check Xcode logs or TestFlight crash reports
- Verify `react-native-plaid-link-sdk` is installed
- Try rebuilding: `eas build --platform ios --profile preview --clear-cache`

---

## 🔍 Debugging Tips

### Check Backend Logs
When you click "Connect Bank", check your Replit app logs for:
```
[PLAID-MOBILE] Opening native Plaid Link
[PLAID] Creating link token ... isNativeApp: true
```

If you don't see these, the WebView isn't properly communicating with React Native.

### Check Device Logs
Use Xcode to view device logs:
1. Connect device to Mac
2. Open Xcode → Window → Devices and Simulators
3. Select your device → Open Console
4. Filter for "PLAID" to see Plaid-related logs

### Verify Native SDK Installation
```bash
cd mobile-app-native-plaid
npm list react-native-plaid-link-sdk
```

Should show version `11.11.0` or similar.

---

## 📱 Build Commands Quick Reference

```bash
# Login to EAS
eas login

# Build for TestFlight (preview)
eas build --platform ios --profile preview

# Build for production
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios --latest

# View build status
eas build:list

# View build logs
eas build:view <build-id>
```

---

## 🔄 Making Updates

When you need to update the app:

1. **Make your code changes** in `App.js` or other files
2. **Bump the build number** in `app.json`:
   ```json
   "ios": {
     "buildNumber": "3"  // Increment this
   }
   ```
3. **Rebuild**:
   ```bash
   eas build --platform ios --profile preview
   ```
4. **Test on TestFlight**

---

## 💡 Pro Tips

### Speed Up Builds
```bash
# Build only for iOS (faster)
eas build --platform ios

# Use cached dependencies
# (EAS does this automatically, but don't use --clear-cache unless needed)
```

### Local Development
You can still test the WebView part locally:
```bash
npm start
# Scan QR code with Expo Go app
```

**Note:** Native Plaid SDK won't work in Expo Go - you need a full build for that.

### Multiple Environments
Create different build profiles in `eas.json` for dev/staging/prod:
```json
{
  "build": {
    "development": {
      "env": {
        "POCKETTRACK_URL": "https://dev-app.replit.app/"
      }
    },
    "production": {
      "env": {
        "POCKETTRACK_URL": "https://prod-app.replit.app/"
      }
    }
  }
}
```

---

## ✅ Success Checklist

Before submitting to TestFlight, verify:

- [ ] `react-native-plaid-link-sdk` is in package.json
- [ ] `POCKETTRACK_URL` points to your actual Replit app
- [ ] Build number is incremented in app.json
- [ ] `pockettrack://plaid-redirect` is in Plaid Dashboard
- [ ] Plaid credentials are correct (PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV)
- [ ] EAS build completes successfully
- [ ] App installs on TestFlight
- [ ] "Connect Bank" opens native Plaid (not loading spinner)

---

## 🆘 Need Help?

If you're stuck:

1. **Check EAS build logs**: `eas build:view <build-id>`
2. **Check Plaid Dashboard**: Verify redirect URI is added
3. **Check backend logs**: Look for `[PLAID-MOBILE]` entries
4. **Test in Expo Go first**: Verify WebView loads correctly
5. **Try a clean build**: `eas build --platform ios --profile preview --clear-cache`

---

## 📚 Additional Resources

- [Expo EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Plaid Mobile SDK Documentation](https://plaid.com/docs/link/mobile/)
- [React Native Plaid Link SDK](https://github.com/plaid/react-native-plaid-link-sdk)
- [TestFlight Guide](https://developer.apple.com/testflight/)

---

**Ready to build?** Start with Step 2! 🚀

The build process usually takes 15-20 minutes. Grab a coffee and check back for your download link!
