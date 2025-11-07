import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, SafeAreaView, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
// FIX: PLAID - Import native Plaid SDK
import { PlaidLink } from 'react-native-plaid-link-sdk';

// Updated with actual PocketTrack URL
const POCKETTRACK_URL = 'https://pocket-track-mvp.replit.app/?t=';

export default function App() {
  const webViewRef = useRef(null);
  const [linkToken, setLinkToken] = useState(null);
  
  // FIX: CACHE-BUSTING - Add timestamp to URL to force fresh load every time
  const [webViewUrl] = useState(() => {
    const timestamp = Date.now();
    return `${POCKETTRACK_URL}?v=${timestamp}`;
  });
  
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
      console.log('[PLAID-MOBILE] WebView message received:', data.type);

      if (data.type === 'PLAID_LINK_TOKEN') {
        console.log('[PLAID-MOBILE] Received link token from WebView');
        
        // FIX: Use link token from WebView (which has cookies) instead of fetching ourselves
        const linkToken = data.linkToken;
        
        if (!linkToken) {
          console.error('[PLAID-MOBILE] No link token provided in message');
          webViewRef.current?.postMessage(JSON.stringify({
            type: 'PLAID_ERROR',
            error: 'No link token received'
          }));
          return;
        }
        
        console.log('[PLAID-MOBILE] Link token received:', {
          tokenPrefix: linkToken.substring(0, 15) + '...'
        });
        
        console.log('[PLAID-MOBILE] Opening native Plaid Link...');
        setLinkToken(linkToken);
      } else if (data.type === 'PLAID_ERROR') {
        // WebView encountered an error fetching link token
        console.error('[PLAID-MOBILE] WebView error:', data.error);
      }
    } catch (error) {
      console.error('[PLAID-MOBILE] Error handling WebView message:', error);
      webViewRef.current?.postMessage(JSON.stringify({
        type: 'PLAID_ERROR',
        error: 'Failed to process request: ' + error.message
      }));
    }
  };

  // FIX: PLAID - Handle successful Plaid connection
  const onPlaidSuccess = async (success) => {
    console.log('[PLAID-MOBILE] Plaid Link completed successfully');
    console.log('[PLAID-MOBILE] Public token received:', {
      tokenPrefix: success.publicToken?.substring(0, 15) + '...',
      metadata: success.metadata
    });
    
    // Clear link token to dismiss Plaid Link
    setLinkToken(null);

    // FIX: Send public token to WebView to exchange (WebView has cookies for auth)
    console.log('[PLAID-MOBILE] Sending public token to WebView for exchange');
    webViewRef.current?.postMessage(JSON.stringify({
      type: 'PLAID_SUCCESS',
      publicToken: success.publicToken,
      metadata: success.metadata
    }));
    
    // WebView will handle the exchange and notify us of success/failure
  };

  // FIX: PLAID - Handle Plaid exit/cancel
  const onPlaidExit = (exit) => {
    console.log('[PLAID-MOBILE] Plaid Link exited:', {
      hasError: !!exit.error,
      errorCode: exit.error?.error_code,
      errorMessage: exit.error?.error_message,
      errorType: exit.error?.error_type
    });
    
    // Clear link token to close Plaid Link
    setLinkToken(null);
    
    if (exit.error) {
      // Plaid returned an error
      const errorMessage = exit.error.error_message || exit.error.display_message || 'An error occurred';
      const errorCode = exit.error.error_code;
      
      console.error('[PLAID-MOBILE] Plaid error:', {
        code: errorCode,
        type: exit.error.error_type,
        message: errorMessage
      });
      
      // Send error to WebView (WebView can handle retry if needed)
      webViewRef.current?.postMessage(JSON.stringify({
        type: 'PLAID_ERROR',
        error: errorMessage,
        errorCode: errorCode
      }));
    } else {
      // User cancelled
      console.log('[PLAID-MOBILE] User cancelled Plaid Link');
      webViewRef.current?.postMessage(JSON.stringify({
        type: 'PLAID_EXIT',
      }));
    }
  };

  // FIX: PLAID - Handle Plaid events (for debugging and analytics)
  const onPlaidEvent = (event) => {
    console.log('[PLAID-MOBILE] Plaid event:', {
      eventName: event.eventName,
      metadata: event.metadata
    });
    
    // Log important events for debugging
    if (event.eventName === 'ERROR') {
      console.error('[PLAID-MOBILE] Plaid event error:', event.metadata);
    } else if (event.eventName === 'HANDOFF') {
      console.log('[PLAID-MOBILE] User handed off to institution website');
    } else if (event.eventName === 'SELECT_INSTITUTION') {
      console.log('[PLAID-MOBILE] User selected institution:', event.metadata?.institution_name);
    }
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
    
    // FIX: PLAID - Keep ALL Plaid URLs in WebView (critical for Plaid Link to work)
    if (url.includes('cdn.plaid.com') || 
        url.includes('link.plaid.com') || 
        url.includes('.plaid.com')) {
      console.log('[MOBILE] Keeping Plaid URL in WebView:', url);
      return false;
    }
    
    // FIX: STRIPE - Open Stripe checkout and billing in system browser
    if (url.includes('checkout.stripe.com') || 
        url.includes('id.stripe.com') ||
        url.includes('billing.stripe.com') ||
        url.includes('/billing/checkout')) {
      console.log('[MOBILE] Opening Stripe in system browser:', url);
      return true;
    }
    
    // FIX: BANK OAuth - Open bank authentication flows in system browser
    if (url.includes('/oauth/') || 
        url.includes('/auth/authorize') || 
        url.includes('/signin') || 
        url.includes('/login')) {
      // But not our own login pages
      if (url.startsWith(POCKETTRACK_URL)) {
        return false;
      }
      console.log('[MOBILE] Opening bank OAuth in system browser:', url);
      return true;
    }
    
    // FIX: CANCELLATION LINKS - Open provider cancellation pages in system browser
    if (url.includes('/cancel') && !url.startsWith(POCKETTRACK_URL)) {
      console.log('[MOBILE] Opening cancellation link in system browser:', url);
      return true;
    }
    
    // Keep common CDNs and fonts in WebView
    const allowedInWebView = [
      'fonts.googleapis.com',
      'fonts.gstatic.com',
    ];
    
    if (allowedInWebView.some(domain => url.includes(domain))) {
      return false;
    }
    
    // Open other external domains in system browser
    if (url.startsWith('http') && !url.startsWith(POCKETTRACK_URL)) {
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

  // FIX: Inject JavaScript to detect WebView environment
  const injectedJavaScript = `
    (function() {
      // Mark as React Native WebView for detection (DON'T overwrite the bridge object!)
      window.isReactNativeWebView = true;
      
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
      
      // Run overlay fixes on load
      if (document.readyState === 'complete') {
        injectOverlayFixes();
      } else {
        window.addEventListener('load', injectOverlayFixes);
      }
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
        source={{ uri: webViewUrl }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onMessage={handleWebViewMessage}
        injectedJavaScript={injectedJavaScript}
        injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
        // FIX: CACHE-BUSTING - Disable code caching to force fresh loads (keeps cookies for auth)
        cacheEnabled={false}
        cacheMode="LOAD_NO_CACHE"
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
        startInLoadingState={false}
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
