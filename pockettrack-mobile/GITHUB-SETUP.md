# PocketTrack Mobile - GitHub Setup Instructions

This standalone React Native project is ready to be pushed to GitHub and imported into Expo.

## Step 1: Initialize Git Repository

From your Replit terminal, run:

```bash
cd pockettrack-mobile
git init
git add .
git commit -m "Initial commit: PocketTrack mobile wrapper"
```

## Step 2: Create New GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create a new repository:
   - **Name:** `pockettrack-mobile` (or your preferred name)
   - **Description:** "PocketTrack - Subscription tracker mobile app (Expo/React Native)"
   - **Visibility:** Public (required for Expo free tier)
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)

## Step 3: Push to GitHub

After creating the repo, GitHub will show you commands. Use these:

```bash
cd pockettrack-mobile
git remote add origin https://github.com/YOUR_USERNAME/pockettrack-mobile.git
git branch -M main
git push -u origin main
```

**Replace `YOUR_USERNAME`** with your actual GitHub username.

## Step 4: Import into Expo

1. Go to [Expo Dashboard](https://expo.dev/)
2. Click **"Create a project"**
3. Select **"Import from GitHub"**
4. Choose your **pockettrack-mobile** repository
5. Click **"Import"**

Expo will:
- Connect to your GitHub repo
- Set up EAS Build automatically
- Prepare for iOS/Android builds

## Step 5: Configure EAS Build

After importing, run these commands locally or in Expo's terminal:

```bash
cd pockettrack-mobile
npm install
npx expo install --check
eas build:configure
```

## Step 6: Build for iOS/Android

### iOS Build (for TestFlight/App Store)
```bash
eas build --platform ios --profile production
```

This will:
- Build your app on Expo's servers
- **Automatically submit to App Store Connect** (via `autoSubmit: true` in eas.json)
- You'll need to provide Apple credentials during first build

### Android Build (for Google Play)
```bash
eas build --platform android --profile production
```

This will:
- Build your app on Expo's servers
- **Automatically submit to Google Play Console** (via `autoSubmit: true` in eas.json)
- You'll need to provide Google Play credentials during first build

## Important Notes

### Bundle Identifier
- **Bundle ID:** `com.pockettrack.app`
- This must match your Apple Developer account and Google Play Console

### Hosted Web App
- The mobile app loads: `https://your-replit-deployment.replit.app`
- Update the `POCKETTRACK_URL` in `App.js` before building:
  ```javascript
  const POCKETTRACK_URL = 'https://YOUR-APP-URL.replit.app';
  ```

### Required Assets
Before building, add app icons to the `assets/` directory:
- `icon.png` - 1024x1024px
- `adaptive-icon.png` - 1024x1024px (Android)
- `splash.png` - 2048x2732px (splash screen)

See `assets/README-ASSETS.txt` for details.

## Troubleshooting

### "Repository not found" when importing to Expo
- Make sure the repository is **public**
- Verify you've pushed to GitHub successfully: `git push -u origin main`

### Build fails with "No credentials"
- Run `eas credentials` to configure Apple/Google credentials
- For iOS: You need an Apple Developer account ($99/year)
- For Android: You need a Google Play Console account ($25 one-time)

### App opens but shows blank screen
- Check that `POCKETTRACK_URL` is correct in `App.js`
- Verify your web app is deployed and accessible
- Check the network logs in the Expo development client

## Next Steps

1. **Test locally:** `npx expo start`
2. **Build preview:** `eas build --platform ios --profile preview` (TestFlight)
3. **Production build:** `eas build --platform ios --profile production` (App Store)
4. **Submit updates:** Just push to GitHub - Expo will rebuild automatically if you enable GitHub Actions

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policies](https://support.google.com/googleplay/android-developer/answer/9859455)

---

**Ready to build!** 🚀

Your standalone React Native project is configured for iOS and Android deployment with automatic App Store submission enabled.
