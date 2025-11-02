# 🚀 Quick Start - Build PocketTrack for TestFlight

## TL;DR - 5 Steps to Deploy

### 1. Download & Setup
```bash
# Extract the mobile app
tar -xzf pockettrack-mobile-native-plaid-FIXED.tar.gz
cd mobile-app-native-plaid

# Install dependencies
npm install

# Verify native Plaid SDK is installed
npm list react-native-plaid-link-sdk
```

### 2. Update App URL
Edit `App.js` line 10:
```javascript
const POCKETTRACK_URL = 'https://YOUR-REPL-NAME.replit.app/';
```

### 3. Configure Plaid Dashboard
1. Go to: https://dashboard.plaid.com/team/api
2. Add redirect URI: `pockettrack://plaid-redirect`
3. Save changes

### 4. Build with EAS
```bash
# First time? Login and configure
eas login
eas build:configure

# Build for TestFlight
eas build --platform ios --profile preview
```

Wait ~15-20 minutes for build to complete.

### 5. Upload to TestFlight
```bash
# Automatic upload
eas submit --platform ios --latest

# Or download .ipa and upload manually via App Store Connect
```

---

## ✅ Verify It Works

1. Install from TestFlight
2. Login to PocketTrack
3. Tap "Connect Bank"
4. **You should see:**
   - ✅ Native iOS Plaid Link (not loading spinner)
   - ✅ Bank selection screen
   - ✅ Authentication completes
   - ✅ Returns to app showing connected bank

---

## 📚 Need More Help?

- **Full guide**: See `BUILD-DEPLOY-GUIDE.md`
- **Plaid config**: See `PLAID-DASHBOARD-CONFIG.md`
- **Troubleshooting**: See `TROUBLESHOOTING.md`

---

## 🔑 Key Points

1. **Native Plaid SDK** = No more infinite loading spinner
2. **Redirect URI required** = `pockettrack://plaid-redirect` in Plaid Dashboard
3. **New build required** = Old TestFlight build won't have the fix
4. **Build number 2** = Check TestFlight shows Build 2 or higher

---

**Ready?** Start with Step 1! 🚀
