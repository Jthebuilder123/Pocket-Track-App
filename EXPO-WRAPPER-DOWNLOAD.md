# PocketTrack Expo Wrapper - Download & Setup

Your Expo WebView wrapper is ready! 🎉

## Download

The wrapper is packaged in: **`pockettrack-expo-wrapper.tar.gz`**

## Extract & Use

### On Mac/Linux:
```bash
tar -xzf pockettrack-expo-wrapper.tar.gz
cd expo-wrapper
```

### On Windows:
Use 7-Zip, WinRAR, or Windows built-in extraction to extract the `.tar.gz` file.

## Quick Start

1. **Extract the archive**
2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Update your URL** in `App.js` (line 8):
   ```javascript
   const POCKETTRACK_URL = 'https://your-actual-replit-url.replit.app';
   ```

4. **Add app icons** to the `assets/` folder:
   - icon.png (1024x1024)
   - adaptive-icon.png (1024x1024)
   - splash.png (2732x2732)

5. **Test locally:**
   ```bash
   npm start
   ```

6. **Build for App Store:**
   ```bash
   npm install -g eas-cli
   eas login
   eas build -p ios --auto-submit
   ```

## What's Inside

```
expo-wrapper/
├── App.js                  # Main app with WebView & link handling
├── package.json            # Dependencies
├── app.json               # App configuration
├── eas.json               # Build configuration
├── README.md              # Detailed documentation
├── .gitignore             # Git ignore rules
└── assets/
    └── README-ASSETS.txt  # Asset requirements
```

## Key Features

✅ Loads your hosted PocketTrack web app  
✅ Opens Plaid links in system browser  
✅ Opens Stripe checkout in system browser  
✅ Keeps internal navigation in-app  
✅ Ready for App Store submission  

## Next Steps

1. Download and extract the tar.gz file
2. Follow the README.md inside the folder
3. Build and submit to App Store using EAS

## Support

Full documentation is in `expo-wrapper/README.md` after extraction.

For questions about:
- **Expo/EAS**: https://docs.expo.dev/
- **PocketTrack**: Your GitHub repo

Good luck with your App Store submission! 🚀
