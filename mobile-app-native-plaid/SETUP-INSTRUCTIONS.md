# PocketTrack Native Plaid Integration Setup

## Critical First Step: Restore Root Package.json

⚠️ **IMPORTANT**: The root `package.json` was accidentally overwritten. You MUST restore it first:

```bash
# Run this in the Replit Shell:
git checkout package.json
```

Then restart the main application workflow.

---

## What's Been Fixed

This mobile app now uses **native Plaid Link SDK** instead of WebView-based Plaid, which fixes the infinite loading spinner issue on TestFlight.

### Changes Made:

1. **App.js**: Updated to use native `react-native-plaid-link-sdk`
   - Intercepts WebView Plaid calls and uses native SDK instead
   - Handles token exchange automatically
   - Provides proper success/error feedback

2. **package.json**: Added `react-native-plaid-link-sdk@^11.11.0`

3. **app.json**: Bumped iOS build number to `2`

4. **Backend**: Updated to support native app redirect URI (`pockettrack://plaid-redirect`)

---

## Setup Steps

### 1. Install Dependencies

```bash
cd mobile-app-native-plaid
npm install
```

### 2. Configure Plaid Dashboard

**CRITICAL**: Add the redirect URI to your Plaid Dashboard:

1. Go to https://dashboard.plaid.com/team/api
2. Navigate to **Settings → API → Allowed redirect URIs**
3. Add: `pockettrack://plaid-redirect`
4. Save changes

**Note**: For production environment (`PLAID_ENV=production`), this is required. For sandbox, it's optional but recommended.

### 3. Update App URL (if needed)

Edit `App.js` and update line 8:

```javascript
const POCKETTRACK_URL = 'https://your-actual-app-url.replit.app/';
```

### 4. Build for TestFlight

```bash
# Make sure you're in the mobile-app-native-plaid directory
cd mobile-app-native-plaid

# Build for iOS (TestFlight)
eas build --platform ios --profile preview

# Or build for production
eas build --platform ios --profile production
```

---

## How It Works

### Native Plaid Flow:

1. **User taps "Connect Bank"** in the WebView
2. **WebView JavaScript** detects the Plaid call and sends message to React Native
3. **React Native** fetches a new link token from your backend
4. **Native Plaid SDK** opens (native iOS/Android experience)
5. **User authenticates** with their bank
6. **On success**, React Native exchanges the public token with your backend
7. **WebView reloads** to show the new bank connection

### Key Features:

- ✅ **No more infinite spinner** - Uses native Plaid SDK
- ✅ **Better UX** - Native iOS/Android Plaid experience
- ✅ **Automatic token exchange** - Handled by React Native layer
- ✅ **Error handling** - Proper error messages to WebView
- ✅ **Deep linking** - Supports `pockettrack://plaid-redirect`

---

## Backend Configuration

The backend (`server/routes.ts`) has been updated to:

1. **Detect native app requests** by checking User-Agent for `ReactNativeWebView`
2. **Use native redirect URI** (`pockettrack://plaid-redirect`) for native apps
3. **Support both WebView and native** Plaid flows simultaneously

No additional backend changes needed!

---

## Testing

### Local Testing (Expo Go):

```bash
npm start
# Then scan QR code with Expo Go app
```

### TestFlight Testing:

1. Build with EAS: `eas build --platform ios --profile preview`
2. Upload to TestFlight
3. Install on device
4. Test "Connect Bank" flow

### What to Expect:

- Tapping "Connect Bank" should immediately open native Plaid Link
- No loading spinner at cdn.plaid.com
- Native iOS authentication experience
- After success, app refreshes and shows connected bank

---

## Troubleshooting

### "Failed to connect bank" Error:

**Check:**
1. Plaid redirect URI is added to Dashboard: `pockettrack://plaid-redirect`
2. Backend has correct `PLAID_CLIENT_ID` and `PLAID_SECRET`
3. `PLAID_ENV` matches your credentials (sandbox vs production)

### Native Plaid doesn't open:

**Check:**
1. `react-native-plaid-link-sdk` is installed: `npm list react-native-plaid-link-sdk`
2. Rebuild the app after installing SDK
3. Check React Native logs for errors

### Backend issues:

**Check server logs for:**
```
[PLAID-MOBILE] Opening native Plaid Link
[PLAID] Creating link token ... isNativeApp: true
```

---

## Environment Variables Required

Make sure your Replit app has these set:

```
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_secret  
PLAID_ENV=sandbox  # or production
```

---

## File Structure

```
mobile-app-native-plaid/
├── App.js                    # ✅ Updated with native Plaid SDK
├── package.json              # ✅ Added react-native-plaid-link-sdk
├── app.json                  # ✅ Bumped build number to 2
├── eas.json                  # EAS Build configuration
├── assets/                   # App icons and splash
└── SETUP-INSTRUCTIONS.md     # This file
```

---

## Next Build

When you're ready to deploy:

1. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Add native Plaid SDK integration"
   ```

2. **Build for TestFlight**:
   ```bash
   eas build --platform ios --profile preview
   ```

3. **Test on device**
4. **Submit to App Store** (when ready for production)

---

## Questions?

If you encounter issues:

1. Check Plaid Dashboard redirect URI configuration
2. Verify backend environment variables
3. Check React Native device logs
4. Test in Expo Go first before building

---

**Happy building! 🚀**
