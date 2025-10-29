# PocketTrack Expo Wrapper

A minimal Expo React Native wrapper that loads your hosted PocketTrack web app in a WebView with intelligent external link handling.

## Features

✅ Loads your hosted PocketTrack site in a native WebView  
✅ Automatically opens Plaid and Stripe links in system browser  
✅ Keeps internal navigation within the app  
✅ Ready for App Store and Google Play submission  
✅ Configured for EAS Build with auto-submit

## Prerequisites

- Node.js 18+ installed
- Expo account (free): https://expo.dev/signup
- Apple Developer Account ($99/year) for iOS
- Google Play Developer Account ($25 one-time) for Android

## Quick Start

### 1. Install Dependencies

```bash
cd pockettrack-mobile
npm install
```

### 2. Update Configuration

**Important:** Before building, update these files:

**App.js** - Line 8:
```javascript
const POCKETTRACK_URL = 'https://your-actual-replit-url.replit.app';
```

**eas.json** - Update submission credentials (only needed for auto-submit):
```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-apple-id@example.com",
      "ascAppId": "your-app-store-connect-app-id",
      "appleTeamId": "your-team-id"
    },
    "android": {
      "serviceAccountKeyPath": "./service-account-key.json"
    }
  }
}
```

**For auto-submit to work:**
- iOS: Update the Apple ID, App Store Connect App ID, and Team ID
- Android: Create and place `service-account-key.json` in the root directory

### 3. Add App Icons & Assets

Create the following images in the `assets/` folder:

- **icon.png** - 1024x1024px (app icon)
- **adaptive-icon.png** - 1024x1024px (Android adaptive icon)
- **splash.png** - 2732x2732px (launch screen)

See `assets/README-ASSETS.txt` for detailed requirements.

### 4. Test Locally

```bash
# Start Expo development server
npm start

# Run on iOS simulator (Mac only)
npm run ios

# Run on Android emulator
npm run android
```

Scan the QR code with Expo Go app on your phone for quick testing.

## Building for Production

### Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### Configure EAS Project

```bash
# Link to your Expo account
eas init

# Configure your build
eas build:configure
```

### Build for iOS

```bash
# Build and submit to App Store automatically
eas build -p ios --auto-submit

# Or build only (manual submission)
eas build -p ios
```

**First time setup:**
1. EAS will prompt for your Apple credentials
2. It will automatically generate signing certificates
3. Choose "production" build profile
4. Wait 15-20 minutes for build to complete

### Build for Android

```bash
# Build and submit to Google Play automatically
eas build -p android --auto-submit

# Or build only (manual submission)
eas build -p android
```

## Configuration Files

### package.json
- Defines dependencies and npm scripts
- Uses Expo SDK 52 (latest stable)

### app.json
- App metadata (name, slug, bundle ID)
- Platform-specific settings
- Icon and splash screen configuration

### eas.json
- EAS Build configuration
- Auto-submit settings for App Store & Google Play
- Build profiles (development, preview, production)

### App.js
- Main application component
- WebView setup with external link handling
- Opens Plaid/Stripe links in system browser

## External Link Handling

The app automatically opens these links in the system browser:

- **Plaid**: Any URL containing `plaid.com`
- **Stripe**: URLs with `checkout.stripe.com` or `/billing/checkout`

To add more external domains, edit `shouldOpenExternally()` in `App.js`:

```javascript
const shouldOpenExternally = (url) => {
  if (url.includes('plaid.com')) return true;
  if (url.includes('checkout.stripe.com')) return true;
  if (url.includes('/billing/checkout')) return true;
  
  // Add your custom domains here
  if (url.includes('example.com')) return true;
  
  return false;
};
```

## App Store Submission Checklist

### iOS App Store

1. ✅ Apple Developer Account active
2. ✅ App icons created (1024x1024)
3. ✅ Bundle ID configured: `com.pockettrack.app`
4. ✅ Privacy policy URL ready
5. ✅ App Store screenshots prepared
6. ✅ App description written
7. ✅ Update `eas.json` with Apple credentials
8. ✅ Run `eas build -p ios --auto-submit`

### Google Play Store

1. ✅ Google Play Developer account active
2. ✅ App icons created (512x512 + 1024x1024)
3. ✅ Package name: `com.pockettrack.app`
4. ✅ Privacy policy URL ready
5. ✅ Play Store screenshots prepared
6. ✅ Feature graphic (1024x500) created
7. ✅ Update `eas.json` with service account key
8. ✅ Run `eas build -p android --auto-submit`

## Testing External Links

To test Plaid/Stripe link handling:

1. Run the app: `npm start`
2. Navigate to a page with Plaid or Stripe links
3. Click a link - it should open in Safari/Chrome (not WebView)
4. Verify you can complete the flow and return to the app

## Troubleshooting

### Build Fails

```bash
# Clear cache and rebuild
eas build -p ios --clear-cache
```

### WebView Not Loading

Check that `POCKETTRACK_URL` in `App.js` is correct and accessible.

### External Links Not Opening

Verify the domain is listed in `shouldOpenExternally()` function.

### Icons Missing

Make sure all required assets are in the `assets/` folder with exact names.

## Updates & Maintenance

### Update the Web App URL

Edit `App.js` line 8 to point to your new deployment URL.

### Over-the-Air Updates

Expo supports OTA updates for JavaScript changes:

```bash
eas update --branch production
```

This updates the app without resubmitting to stores.

## Support

For Expo-specific issues:
- Expo Docs: https://docs.expo.dev/
- Expo Forums: https://forums.expo.dev/

For PocketTrack issues:
- GitHub: https://github.com/yourusername/pockettrack

## License

Same as main PocketTrack project (MIT)
