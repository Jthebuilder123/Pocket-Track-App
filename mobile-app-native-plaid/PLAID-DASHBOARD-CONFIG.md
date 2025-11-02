# Plaid Dashboard Configuration

## ⚠️ CRITICAL: Configure Redirect URI

**Without this configuration, the native Plaid SDK will fail!**

---

## Step-by-Step Instructions

### 1. Login to Plaid Dashboard
Go to: **https://dashboard.plaid.com/**

### 2. Navigate to API Settings
1. Click on **Settings** in the left sidebar
2. Click on **API**
3. Scroll down to **Allowed redirect URIs**

### 3. Add Mobile App Redirect URI

In the **Allowed redirect URIs** section:

1. Click **"Add redirect URI"**
2. Enter: `pockettrack://plaid-redirect`
3. Click **Save changes**

---

## Important Notes

### For Production Environment
- If your `PLAID_ENV` is set to `production`, this redirect URI **MUST** be configured
- Without it, users will see errors during bank authentication

### For Sandbox/Development Environment
- The redirect URI is recommended but may work without explicit configuration
- For consistency, add it anyway

---

## Verify Configuration

After adding the redirect URI, you should see it in the list:

```
Allowed redirect URIs:
✓ pockettrack://plaid-redirect
```

---

## Multiple Environments?

If you have different app versions (dev, staging, prod), you may need multiple schemes:

```
pockettrack://plaid-redirect          (Production)
pockettrack-dev://plaid-redirect      (Development)
pockettrack-staging://plaid-redirect  (Staging)
```

Make sure the scheme in `app.json` matches what you add to Plaid Dashboard.

---

## Troubleshooting

### "Invalid redirect_uri" Error
- Double-check the URI is exactly: `pockettrack://plaid-redirect`
- No trailing slashes
- No extra spaces
- Case-sensitive

### Still Not Working?
1. Wait 2-3 minutes after saving (Plaid may cache settings)
2. Rebuild your mobile app
3. Try uninstalling and reinstalling from TestFlight
4. Check backend logs for `[PLAID]` entries to verify the redirect URI is being used

---

## What This Does

When a user connects their bank:
1. Native Plaid SDK opens → User authenticates
2. Bank redirects to: `pockettrack://plaid-redirect?...`
3. iOS recognizes the scheme and reopens your app
4. Your app processes the result and exchanges the token

Without the redirect URI configured, step 2 fails and the user sees an error.

---

**Done?** Continue to building the app! →
