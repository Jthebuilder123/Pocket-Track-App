# Troubleshooting Guide

## Common Issues & Solutions

---

## 🔄 Infinite Loading Screen (Still Happening)

### Symptom
After clicking "Connect Bank", you see a loading spinner at `cdn.plaid.com` that never finishes.

### Root Cause
You're testing the **old** mobile app build, not the new one with native Plaid SDK.

### Solution
1. **Check build number** in TestFlight:
   - Open TestFlight app
   - Look at PocketTrack → Build number should be **2** or higher
   - If it's Build 1, you're on the old version

2. **Install the new build**:
   - Make sure you built with `eas build --platform ios --profile preview`
   - Check EAS dashboard for successful build
   - Wait for TestFlight email
   - Install the NEW build

3. **Verify in code**:
   ```bash
   # Make sure this file has the native SDK:
   grep "react-native-plaid-link-sdk" mobile-app-native-plaid/App.js
   ```

---

## ❌ "Failed to Connect Bank" Error

### Symptom
Native Plaid opens, but after authenticating, you see "Failed to connect bank"

### Possible Causes & Solutions

#### 1. Missing Redirect URI in Plaid Dashboard
**Check:**
- Go to Plaid Dashboard → Settings → API → Allowed redirect URIs
- Verify `pockettrack://plaid-redirect` is listed

**Fix:**
- Add the redirect URI
- Wait 2-3 minutes
- Try again

#### 2. Wrong Plaid Environment
**Check:**
- What's your `PLAID_ENV` in Replit? (sandbox or production)
- Do your `PLAID_CLIENT_ID` and `PLAID_SECRET` match that environment?

**Fix:**
```bash
# In Replit, check secrets:
# PLAID_ENV should be "sandbox" or "production"
# PLAID_CLIENT_ID and PLAID_SECRET must match that environment
```

#### 3. Backend Not Receiving Request
**Check backend logs:**
```
# Look for these in Replit logs:
[PLAID-MOBILE] Opening native Plaid Link
[PLAID] Creating link token ... isNativeApp: true
```

**If missing:**
- The WebView isn't communicating with React Native
- Try rebuilding the app
- Check App.js has the injected JavaScript

---

## 📱 App Crashes When Clicking "Connect Bank"

### Symptom
App immediately closes or freezes when you tap the button

### Solutions

#### 1. Native SDK Not Installed
```bash
cd mobile-app-native-plaid
npm list react-native-plaid-link-sdk
```

Should show version `11.11.0`. If not:
```bash
npm install
eas build --platform ios --profile preview --clear-cache
```

#### 2. Build Cache Issue
```bash
# Force a clean build
eas build --platform ios --profile preview --clear-cache
```

#### 3. Check Crash Logs
- Open TestFlight → Tap your app
- Go to "Previous Builds"
- Select your build → View crash logs
- Look for Plaid-related errors

---

## 🔐 Authentication Issues

### Symptom
Can't login to PocketTrack in the mobile app

### Solutions

#### 1. Check WebView URL
Verify `POCKETTRACK_URL` in App.js points to your live Replit:
```javascript
const POCKETTRACK_URL = 'https://your-repl.replit.app/';
```

#### 2. Session/Cookie Issues
- Mobile WebViews handle sessions differently
- Make sure `thirdPartyCookiesEnabled={true}` in App.js
- Try logging out and back in

---

## 🏗️ Build Failures

### Symptom
`eas build` command fails

### Common Causes

#### 1. Invalid Credentials
```bash
# Re-login to EAS
eas logout
eas login
```

#### 2. Missing Apple Developer Access
- Verify you're part of the Apple Developer team
- Check App Store Connect access
- Ensure certificates are valid

#### 3. Dependency Issues
```bash
# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 4. Check Build Logs
```bash
# View detailed logs
eas build:view <build-id>
```

Look for specific error messages about missing dependencies or configuration.

---

## 🌐 WebView Issues

### Symptom
App loads but shows blank white screen

### Solutions

#### 1. Check URL
- Verify `POCKETTRACK_URL` is correct
- Open that URL in mobile Safari to test
- Make sure it's `https://` not `http://`

#### 2. CSP Issues
- Check backend CSP configuration allows iframe embedding
- May need to adjust `Content-Security-Policy` headers

#### 3. Check Console Logs
Add debugging:
```javascript
<WebView
  onError={(syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error: ', nativeEvent);
  }}
  onHttpError={(syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('HTTP error: ', nativeEvent);
  }}
/>
```

---

## 🔍 Debugging Techniques

### Check if Native Plaid SDK is Working

Add logging to `App.js`:
```javascript
const handleWebViewMessage = async (event) => {
  console.log('[DEBUG] Received message:', event.nativeEvent.data);
  // ... rest of code
};

const onPlaidSuccess = async (success) => {
  console.log('[DEBUG] Plaid success! Public token received');
  // ... rest of code
};
```

### Check Backend Communication

In your Replit logs, filter for:
- `[PLAID]` - Link token creation
- `[PLAID-MOBILE]` - Mobile app specific logs
- `exchange_public_token` - Token exchange endpoint

### Use Xcode Device Console

1. Connect iPhone to Mac
2. Open Xcode → Window → Devices and Simulators
3. Select device → Open Console
4. Filter for "PLAID" or "PocketTrack"

---

## 🆘 Still Stuck?

### Verify Complete Setup

Run through this checklist:

- [ ] Built with `eas build --platform ios --profile preview`
- [ ] Installed NEW build from TestFlight (build 2+)
- [ ] `react-native-plaid-link-sdk` in package.json
- [ ] `POCKETTRACK_URL` points to correct Replit URL
- [ ] `pockettrack://plaid-redirect` in Plaid Dashboard
- [ ] Plaid credentials are correct (CLIENT_ID, SECRET, ENV)
- [ ] Backend is running (check Replit logs)
- [ ] Can login to PocketTrack in mobile app
- [ ] Can login to PocketTrack in desktop browser

### Create a Minimal Test

1. Test Plaid on **desktop browser** first
2. If desktop works, issue is mobile-specific
3. If desktop fails, issue is backend/Plaid config

### Get Detailed Logs

```bash
# Backend logs (Replit)
# Look for [PLAID] entries when clicking Connect Bank

# Device logs (Xcode)
# Filter for "PLAID" or "PocketTrack"

# Build logs (EAS)
eas build:view <build-id>
```

---

## 📞 Additional Help

If none of these solutions work:

1. **Check Expo Forums**: https://forums.expo.dev/
2. **Plaid Support**: https://support.plaid.com/
3. **React Native Plaid SDK Issues**: https://github.com/plaid/react-native-plaid-link-sdk/issues

---

**Most Common Fix:** Make sure you're testing the NEW build with native Plaid SDK, not the old WebView-based build! 🚀
