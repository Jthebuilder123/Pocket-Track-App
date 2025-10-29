ASSET REQUIREMENTS FOR POCKETTRACK EXPO APP
===========================================

You need to create the following image assets before building:

1. icon.png
   - Size: 1024x1024 pixels
   - Format: PNG with transparency
   - Purpose: App icon for iOS and Android

2. adaptive-icon.png (Android)
   - Size: 1024x1024 pixels
   - Format: PNG with transparency
   - Purpose: Android adaptive icon (foreground layer)
   - Note: Center important content in the middle 66% of the icon

3. splash.png
   - Size: 2732x2732 pixels (or at least 1284x2778 for iPhone)
   - Format: PNG
   - Purpose: Launch/splash screen
   - Background color is set to #0f172a in app.json

4. favicon.png (Optional - for web)
   - Size: 48x48 pixels
   - Format: PNG with transparency
   - Purpose: Web favicon

QUICK START:
-----------
If you don't have assets ready, you can:
1. Use a placeholder 1024x1024 solid color PNG for icon.png and adaptive-icon.png
2. Use a placeholder 2732x2732 solid color PNG for splash.png
3. Build and test the app first, then replace with final assets later

The app will still build and run without perfect assets, but they are required for App Store submission.
