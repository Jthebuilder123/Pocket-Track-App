import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, SafeAreaView, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
// FIX: PLAID - Import native Plaid SDK
import { PlaidLink } from 'react-native-plaid-link-sdk';

// Updated with actual PocketTrack URL
const POCKETTRACK_URL = 'https://pocket-track-MVP.replit.app/';

export default function App() {
  const webViewRef = useRef(null);
  const [linkToken, setLinkToken] = useState(null);
  
  // FIX: EXTERNAL LINKS - Handle deep linking returns from system browser
  useEffect(() => {
    const handleDeepLink = (event) => {
      console.log('[MOBILE] Deep link received:', event.url);
      
      // FIX: Refresh WebView when returning from external browser
      if (event.url.startsWith('pockettrack://')) {
        console.log('[MOBILE] Returning from external browser, refreshing WebView');
        
        // Reload the WebView to show updated state
        webViewRef.current?.reload();
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    return () => {
      subscription.remove();
    };
  }, []);

  // FIX: PLAID - Listen for messages from WebView to open native Plaid
  const handleWebViewMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('[PLAID-MOBILE] WebView message:', data.type);

      if (data.type === 'OPEN_PLAID_NATIVE') {
        console.log('[PLAID-MOBILE] Opening native Plaid Link');
        
        // Fetch link token from backend
        const response = await fetch(`${POCKETTRACK_URL}api/plaid/create_link_token`, {
          credentials: 'include',
        });
        
        if (!response.ok) {
          console.error('[PLAID-MOBILE] Failed to fetch link token:', response.status);
          webViewRef.current?.postMessage(JSON.stringify({
            type: 'PLAID_ERROR',
            error: 'Failed to create link token'
          }));
          return;
        }

        const { link_token } = await response.json();
        console.log('[PLAID-MOBILE] Link token received, opening Plaid');
        setLinkToken(link_token);
      }
    } catch (error) {
      console.error('[PLAID-MOBILE] Error handling WebView message:', error);
    }
  };

  // FIX: PLAID - Handle successful Plaid connection
  const onPlaidSuccess = async (success) => {
    console.log('[PLAID-MOBILE] Plaid success:', success.publicToken);
    setLinkToken(null);

    // Exchange public token with backend
    try {
      const response = await fetch(`${POCKETTRACK_URL}api/plaid/exchange_public_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ public_token: success.publicToken }),
      });

      if (response.ok) {
        console.log('[PLAID-MOBILE] Token exchanged successfully');
        // Notify WebView of success
        webViewRef.current?.postMessage(JSON.stringify({
          type: 'PLAID_SUCCESS',
        }));
      } else {
        console.error('[PLAID-MOBILE] Failed to exchange token:', response.status);
        webViewRef.current?.postMessage(JSON.stringify({
          type: 'PLAID_ERROR',
          error: 'Failed to exchange token'
        }));
      }
    } catch (error) {
      console.error('[PLAID-MOBILE] Error exchanging token:', error);
      webViewRef.current?.postMessage(JSON.stringify({
        type: 'PLAID_ERROR',
        error: error.message
      }));
    }
  };

  // FIX: PLAID - Handle Plaid exit/cancel
  const onPlaidExit = (exit) => {
    console.log('[PLAID-MOBILE] Plaid exited:', exit.error || 'User cancelled');
    setLinkToken(null);
    
    if (exit.error) {
      webViewRef.current?.postMessage(JSON.stringify({
        type: 'PLAID_ERROR',
        error: exit.error.message
      }));
    } else {
      // User cancelled
      webViewRef.current?.postMessage(JSON.stringify({
        type: 'PLAID_CANCELLED',
      }));
    }
  };

  // FIX: PLAID - Handle Plaid events
  const onPlaidEvent = (event) => {
    console.log('[PLAID-MOBILE] Plaid event:', event.eventName);
  };

  // Handle navigation requests
  const handleNavigationStateChange = (navState) => {
    const { url } = navState;
    
    // Check if this is an external link that should open in system browser
    if (shouldOpenExternally(url)) {
      // Prevent WebView from loading this URL
      webViewRef.current?.stopLoading();
      
      // Open in system browser
      Linking.openURL(url);
      
      return false;
    }
    
    return true;
  };

  // FIX: EXTERNAL LINKS - Determine if URL should open in external browser
  const shouldOpenExternally = (url) => {
    // Don't intercept our own domain
    if (url.startsWith(POCKETTRACK_URL)) {
      return false;
    }
    
    // FIX: STRIPE - Open Stripe checkout and billing in system browser
    if (url.includes('checkout.stripe.com') || 
        url.includes('billing.stripe.com') ||
        url.includes('/billing/checkout')) {
      console.log('[MOBILE] Opening Stripe checkout in system browser:', url);
      return true;
    }
    
    // FIX: CANCELLATION LINKS - Open provider cancellation pages in system browser
    if (url.includes('/cancel') && !url.startsWith(POCKETTRACK_URL)) {
      console.log('[MOBILE] Opening cancellation link in system browser:', url);
      return true;
    }
    
    // Open any external domain (not our app) in system browser
    if (url.startsWith('http') && !url.startsWith(POCKETTRACK_URL)) {
      // But allow common CDNs and auth providers in WebView
      const allowedInWebView = [
        'cdn.plaid.com',  // Keep for fallback
        'fonts.googleapis.com',
        'fonts.gstatic.com',
      ];
      
      if (allowedInWebView.some(domain => url.includes(domain))) {
        return false;
      }
      
      console.log('[MOBILE] Opening external link in system browser:', url);
      return true;
    }
    
    return false;
  };

  // Handle links that try to open in new window
  const handleShouldStartLoadWithRequest = (request) => {
    const { url } = request;
    
    // Check if should open externally
    if (shouldOpenExternally(url)) {
      Linking.openURL(url);
      return false; // Don't load in WebView
    }
    
    return true; // Load in WebView
  };

  // FIX: Inject JavaScript to detect WebView environment and intercept Plaid
  const injectedJavaScript = `
    (function() {
      // Mark as React Native WebView for detection
      window.ReactNativeWebView = true;
      
      // FIX: OVERLAY - Add CSS to prevent overlays from blocking clicks
      const injectOverlayFixes = () => {
        const style = document.createElement('style');
        style.textContent = \`
          /* FIX: Prevent hidden overlays from blocking clicks */
          .overlay[aria-hidden="true"], 
          .drawer[aria-hidden="true"],
          [data-state="closed"],
          [data-state="hidden"] {
            pointer-events: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
          }
          
          /* Ensure visible overlays work correctly */
          .overlay[aria-hidden="false"],
          .drawer[aria-hidden="false"],
          [data-state="open"],
          [data-state="visible"] {
            pointer-events: auto !important;
          }
        \`;
        document.head.appendChild(style);
        console.log('[MOBILE] Overlay click-blocking fixes injected');
      };
      
      // FIX: PLAID - Override Plaid Link creation to use native SDK
      const checkAndOverridePlaid = () => {
        if (window.Plaid && window.Plaid.create) {
          const originalPlaidCreate = window.Plaid.create;
          window.Plaid.create = function(config) {
            console.log('[PLAID-WEBVIEW] Intercepting Plaid.create, using native SDK');
            
            // Send message to React Native to open native Plaid
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'OPEN_PLAID_NATIVE'
            }));
            
            // Return a dummy handler
            return {
              open: function() {
                console.log('[PLAID-WEBVIEW] Native Plaid will open');
              },
              exit: function() {},
              destroy: function() {}
            };
          };
          console.log('[PLAID-WEBVIEW] Plaid.create overridden for native SDK');
        } else {
          setTimeout(checkAndOverridePlaid, 100);
        }
      };
      
      // Start checking after page loads
      if (document.readyState === 'complete') {
        injectOverlayFixes();
        checkAndOverridePlaid();
      } else {
        window.addEventListener('load', () => {
          injectOverlayFixes();
          checkAndOverridePlaid();
        });
      }
      
      // Also check on DOM changes
      setTimeout(checkAndOverridePlaid, 1000);
      setTimeout(checkAndOverridePlaid, 3000);
    })();
    true;
  `;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      {/* FIX: PLAID - Native Plaid Link */}
      {linkToken && (
        <PlaidLink
          tokenConfig={{
            token: linkToken,
            noLoadingState: false,
          }}
          onSuccess={onPlaidSuccess}
          onExit={onPlaidExit}
          onEvent={onPlaidEvent}
        >
          {/* Plaid Link will open automatically */}
        </PlaidLink>
      )}
      
      <WebView
        ref={webViewRef}
        source={{ uri: POCKETTRACK_URL }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onMessage={handleWebViewMessage}
        injectedJavaScript={injectedJavaScript}
        injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
        // Enable JavaScript
        javaScriptEnabled={true}
        // Enable DOM storage (for localStorage, sessionStorage)
        domStorageEnabled={true}
        // Allow third-party cookies (needed for auth)
        thirdPartyCookiesEnabled={true}
        // Handle media playback
        mediaPlaybackRequiresUserAction={false}
        // Allow inline media playback on iOS
        allowsInlineMediaPlayback={true}
        // Bounce effect on scroll (iOS)
        bounces={true}
        // Pull to refresh
        pullToRefreshEnabled={true}
        // Start in loading state
        startInLoadingState={true}
        // Allow file access
        allowFileAccess={true}
        // User agent (mark as ReactNativeWebView)
        userAgent={Platform.select({
          ios: 'PocketTrack-iOS/1.0 ReactNativeWebView',
          android: 'PocketTrack-Android/1.0 ReactNativeWebView',
        })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
  },
});
