# 🚀 Build Your Mobile App from Replit Shell

Your app is configured and ready to build! Just run these commands in Replit's Shell.

---

## ✅ What's Already Done

- ✅ App.js updated with your URL: `https://pocket-track-MVP.replit.app/`
- ✅ Native Plaid SDK configured in package.json
- ✅ All files ready to build

---

## 📝 Build Commands (Run in Replit Shell)

### Step 1: Open Replit Shell

In Replit, look for the **Shell** tab at the bottom of the screen (next to Console). Click it to open the terminal.

### Step 2: Navigate to Mobile App Directory

```bash
cd mobile-app-native-plaid
```

### Step 3: Install Dependencies

```bash
npm install
```

This installs the native Plaid SDK and all other dependencies. Takes 2-5 minutes.

### Step 4: Install EAS CLI

```bash
npm install -g eas-cli
```

This installs Expo's build tool globally.

### Step 5: Login to Expo

```bash
eas login
```

**You'll be asked for:**
- Expo username/email
- Password

**Don't have an Expo account?**
- Create one FREE at: https://expo.dev/signup
- Then come back and run `eas login`

### Step 6: Build for iOS

```bash
eas build --platform ios --profile preview
```

**What happens:**
- EAS uploads your app to their cloud build servers
- They compile it with the native Plaid SDK
- Takes **15-20 minutes**
- You'll see progress updates in the terminal

**When complete, you'll see:**
```
✔ Build finished
Build ID: abc123-def456-...
```

### Step 7: Submit to TestFlight

```bash
eas submit --platform ios --latest
```

**You'll be asked for:**
- Apple ID email
- App-specific password (create at appleid.apple.com if needed)

**This uploads your build to TestFlight**
- Takes 2-5 minutes
- Apple processes it for 5-30 minutes
- You'll get an email when ready to test

---

## 📱 Testing the New Build

### Install from TestFlight

1. Check your email for "Build Ready to Test" from Apple
2. Open **TestFlight** app on your iPhone
3. Find **PocketTrack**
4. Look for **Build 2** (or higher)
5. Tap **Install**

### Test the Fix

1. Open PocketTrack from TestFlight
2. Login to your account
3. Tap **"Connect Bank"**

**✅ SUCCESS looks like:**
- Native iOS Plaid Link opens **immediately**
- No loading spinner
- Clean native interface
- Can search for your bank
- Can authenticate successfully

**❌ If you still see loading spinner:**
- You're testing the old Build 1
- Make sure you installed Build 2 or higher from TestFlight

---

## 🐛 Troubleshooting

### "npm: command not found"

Node.js isn't installed in Replit. Run:
```bash
# In Replit Shell
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
```

### "eas: command not found"

The global install didn't work. Try:
```bash
npx eas-cli login
npx eas-cli build --platform ios --profile preview
npx eas-cli submit --platform ios --latest
```

### Build fails

Clear cache and try again:
```bash
eas build --platform ios --profile preview --clear-cache
```

### "Failed to connect bank" in app

Verify:
- Your main PocketTrack app is running in Replit
- The URL in App.js matches exactly: `https://pocket-track-MVP.replit.app/`
- Try the web version to confirm backend works

---

## ⏱️ Timeline

| Step | Time |
|------|------|
| Install dependencies | 3-5 min |
| EAS build | 15-20 min |
| Submit to TestFlight | 2-5 min |
| Apple processing | 5-30 min |
| **Total** | **25-60 min** |

---

## 🎉 Success!

When everything works, you'll:
1. Tap "Connect Bank" in the app
2. See native iOS Plaid open instantly
3. Authenticate with your bank
4. Return to app with bank connected
5. See transactions syncing

**No more loading spinners!** 🎊

---

**Ready? Open Replit Shell and start with Step 2!** 🚀
