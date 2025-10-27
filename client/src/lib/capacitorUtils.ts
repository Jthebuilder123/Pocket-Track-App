// CAP: Capacitor utilities for handling external browser flows (Plaid, Stripe)
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

// CAP: Detect if app is running in Capacitor (native mobile)
export const isCapacitor = (): boolean => {
  return Capacitor.isNativePlatform();
};

// CAP: Get the platform (ios, android, web)
export const getPlatform = (): string => {
  return Capacitor.getPlatform();
};

// CAP: Open URL in system browser (for Plaid Link, Stripe Checkout)
// This uses SFSafariViewController on iOS and Custom Tabs on Android
export const openInSystemBrowser = async (url: string): Promise<void> => {
  if (!isCapacitor()) {
    // CAP: If not in Capacitor, just open in new window
    window.open(url, '_blank');
    return;
  }

  try {
    // CAP: Open URL in native browser (SFSafariViewController/Custom Tabs)
    await Browser.open({
      url,
      presentationStyle: 'popover', // iOS presentation style
      toolbarColor: '#0f172a', // Match app theme
    });

    // CAP: Listen for browser close event
    Browser.addListener('browserFinished', () => {
      console.log('CAP: Browser closed, user returned to app');
    });
  } catch (error) {
    console.error('CAP: Failed to open system browser:', error);
    // CAP: Fallback to window.open if Browser plugin fails
    window.open(url, '_blank');
  }
};

// CAP: Close system browser programmatically (if needed)
export const closeSystemBrowser = async (): Promise<void> => {
  if (isCapacitor()) {
    try {
      await Browser.close();
    } catch (error) {
      console.error('CAP: Failed to close browser:', error);
    }
  }
};

// CAP: Handle deep link return from Plaid
// This will be called when user returns from Plaid OAuth flow
// Note: Plaid OAuth only returns public_token in redirect URL, not full metadata
export const handlePlaidReturn = (callback: (publicToken?: string) => void) => {
  if (!isCapacitor()) return;

  // CAP: Listen for app URL open (deep link)
  import('@capacitor/app').then(({ App }) => {
    App.addListener('appUrlOpen', (event) => {
      const url = event.url;
      
      // CAP: Check if it's a Plaid return URL
      if (url.includes('callback')) {
        console.log('CAP: Plaid callback detected:', url);
        
        // CAP: Extract public_token from URL
        const urlParams = new URLSearchParams(url.split('?')[1]);
        const publicToken = urlParams.get('public_token');
        const oauth_state_id = urlParams.get('oauth_state_id');
        
        // CAP: Plaid returns either public_token (success) or error codes (failure)
        if (publicToken) {
          console.log('CAP: Plaid OAuth successful, got public_token');
          // CAP: Close the browser and call callback with public_token
          closeSystemBrowser().then(() => {
            callback(publicToken);
          });
        } else {
          // CAP: No public token, user may have canceled or encountered error
          console.log('CAP: Plaid OAuth completed without public_token');
          closeSystemBrowser().then(() => {
            callback(undefined);
          });
        }
      }
    });
  });
};

// CAP: Handle deep link return from Stripe
// This will be called when user returns from Stripe Checkout
export const handleStripeReturn = (
  onSuccess?: () => void,
  onCancel?: () => void
) => {
  if (!isCapacitor()) return;

  // CAP: Listen for app URL open (deep link)
  import('@capacitor/app').then(({ App }) => {
    App.addListener('appUrlOpen', (event) => {
      const url = event.url;
      
      // CAP: Check if it's a Stripe return URL
      if (url.includes('stripe') || url.includes('pockettrack://stripe')) {
        console.log('CAP: Stripe return detected:', url);
        
        // CAP: Check for success or cancel
        const urlParams = new URLSearchParams(url.split('?')[1]);
        const sessionId = urlParams.get('session_id');
        const canceled = urlParams.get('canceled');
        
        // CAP: Close the browser
        closeSystemBrowser().then(() => {
          if (canceled === 'true' && onCancel) {
            onCancel();
          } else if (sessionId && onSuccess) {
            onSuccess();
          }
        });
      }
    });
  });
};

// CAP: Configure return URLs for Plaid/Stripe based on environment
export const getReturnUrl = (service: 'plaid' | 'stripe'): string => {
  if (!isCapacitor()) {
    // CAP: Web environment - use current origin
    return `${window.location.origin}/${service}/callback`;
  }

  // CAP: Capacitor environment - use custom URL scheme
  const platform = getPlatform();
  
  if (platform === 'ios') {
    // CAP: iOS uses custom scheme
    return `pockettrack://${service}/callback`;
  } else {
    // CAP: Android uses https scheme with app links
    return `https://pockettrack.app/${service}/callback`;
  }
};
