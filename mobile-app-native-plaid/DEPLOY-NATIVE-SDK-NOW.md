# 🚀 Deploy Native SDK Build to TestFlight - Action Plan

## Current Situation
- ❌ You deployed the OLD WebView build (loading spinner bug)
- ✅ The FIXED native SDK build is ready in `mobile-app-native-plaid/`
- 🎯 Goal: Deploy the fixed version to replace the broken one

---

## Step-by-Step Deployment Checklist

### ✅ Step 1: Get the Mobile App on Your Local Machine

**Option A - Download from Replit:**
```bash
# Download pockettrack-mobile-READY-TO-BUILD.tar.gz from Replit Files panel
# Then extract it:
tar -xzf pockettrack-mobile-READY-TO-BUILD.tar.gz
cd mobile-app-native-plaid
```

**Option B - Clone from Replit (if you have git access):**
```bash
# Just get the mobile-app-native-plaid directory from your Replit
```

**Verify you're in the right place:**
```bash
# You should see these files:
ls -la
# Look for: App.js, package.json, app.json, eas.json
```

---

### ✅ Step 2: Update Your Backend URL

**Edit `App.js` line 10:**

Find this line:
```javascript
const POCKETTRACK_URL = 'https://your-repl.replit.app/';
```

Replace with your **actual Replit URL**. To find it:
1. Open your Replit project
2. Look at the Webview panel at the top
3. Copy the URL (looks like `https://xyz-abc-123.replit.app/`)

**Example:**
```javascript
const POCKETTRACK_URL = 'https://pockettrack-abc123.replit.app/';
```

⚠️ **Don't forget the trailing slash `/` at the end!**

---

### ✅ Step 3: Install Dependencies (Includes Native SDK)

```bash
# Make sure you're in mobile-app-native-plaid/ directory
npm install
```

**What this does:**
- Installs `react-native-plaid-link-sdk@11.11.0` (the native SDK!)
- Installs all other dependencies
- Takes about 2-5 minutes

**Verify it worked:**
```bash
# Check if native SDK is installed:
npm list react-native-plaid-link-sdk

# Should show:
# react-native-plaid-link-sdk@11.11.0
```

---

### ✅ Step 4: Login to EAS (First Time Only)

```bash
# Install EAS CLI globally (if not already installed)
npm install -g eas-cli

# Login to your Expo account
eas login
```

**If you don't have an Expo account:**
1. Create one at https://expo.dev/signup (free)
2. Then run `eas login`

---

### ✅ Step 5: Build for iOS TestFlight

```bash
# Start the build (takes 15-20 minutes)
eas build --platform ios --profile preview
```

**What happens:**
1. EAS uploads your app to their build servers
2. They compile it with the native Plaid SDK
3. You get an `.ipa` file when done
4. Progress updates appear in terminal

**While waiting:**
- ☕ Grab coffee - this takes 15-20 minutes
- 📧 You'll get an email when build completes
- 🔗 Or watch progress at: https://expo.dev/accounts/YOUR-ACCOUNT/projects

**When complete, you'll see:**
```
✔ Build finished
Build ID: abc123-def456-...
Build artifact: https://expo.dev/artifacts/...
```

---

### ✅ Step 6: Submit to TestFlight

```bash
# Upload the build to TestFlight
eas submit --platform ios --latest
```

**What this does:**
- Takes the build you just created
- Uploads it to App Store Connect
- Submits it for TestFlight review (usually instant)

**You'll be asked for:**
- Apple ID email
- App-specific password (create one at appleid.apple.com)

**Takes:** 2-5 minutes to upload

---

### ✅ Step 7: Wait for TestFlight Processing

**After submission:**
1. Check your email for "Build is Ready to Test" from Apple
2. Usually takes 5-10 minutes
3. Sometimes up to 30 minutes

**You can also check:**
- App Store Connect → TestFlight → Builds
- Look for new build with status "Ready to Test"

---

### ✅ Step 8: Install NEW Build from TestFlight

**On your iPhone:**

1. Open **TestFlight** app
2. Find **PocketTrack**
3. Look at the build number - should show **"Build 2"** or higher
4. Tap **Install** or **Update**

⚠️ **Critical:** Make sure you're installing the NEW build (Build 2+), not the old one (Build 1)

**Verify:**
- Build number should be 2 or higher
- Version should match app.json (1.0.0)

---

### ✅ Step 9: Test the Fixed Version

**On your iPhone with TestFlight app:**

1. **Open PocketTrack** from TestFlight
2. **Login** to your account
3. **Navigate** to dashboard or bank connections
4. **Tap "Connect Bank"** button

**✅ SUCCESS looks like:**
- Native iOS Plaid Link opens **immediately**
- No loading spinner
- No cdn.plaid.com page
- Clean, native iOS interface
- Search bar to find your bank
- Can select bank and authenticate

**❌ FAILURE looks like:**
- Loading spinner at cdn.plaid.com (means you installed old build)
- "Failed to connect" error
- Nothing happens when tapping button

---

### ✅ Step 10: Complete the Flow

**If Step 9 succeeded:**

1. **Select your bank** from the list
2. **Enter credentials** in native Plaid UI
3. **Authenticate** (MFA if required)
4. **Return to app** automatically
5. **Verify** bank appears in "Connected Banks"

**Success indicators:**
- ✅ No errors
- ✅ Bank shows in connected list
- ✅ Transactions start syncing
- ✅ Can view transaction details

---

## 🐛 Troubleshooting

### Problem: Still seeing loading spinner

**Cause:** You're testing the old build

**Solution:**
1. Check TestFlight build number - should be 2+
2. If it says Build 1, wait for new build to process
3. Make sure you built from `mobile-app-native-plaid/` directory
4. Verify `package.json` includes `react-native-plaid-link-sdk`

### Problem: Build fails at Step 5

**Cause:** Various reasons

**Solutions:**
```bash
# Clear cache and try again
eas build --platform ios --profile preview --clear-cache

# Check eas.json exists
cat eas.json

# Verify package.json is correct
grep "react-native-plaid-link-sdk" package.json
```

### Problem: "Failed to connect bank" in app

**Cause:** Backend URL wrong or Plaid credentials issue

**Solutions:**
1. Verify `POCKETTRACK_URL` in App.js matches your Replit
2. Make sure Replit app is running (check web version works)
3. Check Plaid environment variables in Replit secrets

### Problem: App crashes when tapping "Connect Bank"

**Cause:** Native SDK not properly installed

**Solutions:**
1. Delete `node_modules` and run `npm install` again
2. Rebuild with `eas build --clear-cache`
3. Check build logs for errors

---

## 📊 Expected Timeline

| Step | Time Required |
|------|---------------|
| 1-3: Setup & config | 5 minutes |
| 4: Install dependencies | 3-5 minutes |
| 5: EAS build | 15-20 minutes |
| 6: Submit to TestFlight | 2-5 minutes |
| 7: Apple processing | 5-30 minutes |
| 8-10: Install & test | 5 minutes |
| **TOTAL** | **35-70 minutes** |

---

## ✅ Success Checklist

After completing all steps, you should have:

- [x] New build in TestFlight (Build 2+)
- [x] Native Plaid opens when tapping "Connect Bank"
- [x] No loading spinner
- [x] Can successfully authenticate with bank
- [x] Bank appears in app after connecting
- [x] Transactions sync correctly

---

## 🆘 Need Help?

**Before reaching out:**
1. Check which build number you're testing
2. Verify `POCKETTRACK_URL` in App.js is correct
3. Confirm `npm install` completed successfully
4. Check build logs on expo.dev for errors

**Common mistakes:**
- Testing old build (Build 1) instead of new build (Build 2+)
- Forgot to update `POCKETTRACK_URL` in App.js
- Didn't run `npm install` before building
- Built from wrong directory

---

## 🎉 What Success Looks Like

**Complete flow:**
1. Open PocketTrack on iPhone ✅
2. Login to account ✅
3. Tap "Connect Bank" ✅
4. **Native iOS Plaid opens instantly** ✅
5. Search and select bank ✅
6. Enter credentials ✅
7. Authenticate successfully ✅
8. **Return to app** ✅
9. **Bank appears in connected list** ✅
10. Transactions start syncing ✅

**No more:**
- ❌ Loading spinners
- ❌ cdn.plaid.com errors
- ❌ "Failed to connect" messages
- ❌ Infinite loading screens

---

**Ready? Start with Step 1!** 🚀

The mobile app is fully configured and ready to build. Just follow these steps and you'll have the native SDK version running on TestFlight within an hour.
