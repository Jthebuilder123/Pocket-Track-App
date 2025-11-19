import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, SafeAreaView, Platform, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { StatusBar } from 'expo-status-bar';
// FIX: PLAID - Import native Plaid SDK
import { PlaidLink } from 'react-native-plaid-link-sdk';

// Updated with actual PocketTrack URL
const POCKETTRACK_URL = 'https://pocket-track-mvp.replit.app';

export default function App() {
  const webViewRef = useRef(null);
  const [linkToken, setLinkToken] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;
  
  // FIX: LOADING - Track WebView loading state
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  
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
    
    // Reset retry count on success
    setRetryCount(0);

    // FIX: Send public token to WebView to exchange (WebView has cookies for auth)
    console.log('[PLAID-MOBILE] Sending public token to WebView for exchange');
    webViewRef.current?.postMessage(JSON.stringify({
      type: 'PLAID_SUCCESS',
      publicToken: success.publicToken,
      metadata: success.metadata
    }));
    
    // WebView will handle the exchange and notify us of success/failure
  };

  // FIX: PLAID RETRY - Request fresh link token and retry
  const retryPlaidLink = () => {
    console.log('[PLAID-MOBILE] Requesting fresh link token for retry...');
    
    // Ask WebView to fetch a new link token
    webViewRef.current?.postMessage(JSON.stringify({
      type: 'PLAID_RETRY_REQUEST',
    }));
    
    // Increment retry count
    setRetryCount(prev => prev + 1);
  };

  // FIX: PLAID - Handle Plaid exit/cancel
  const onPlaidExit = (exit) => {
    console.log('[PLAID-MOBILE] Plaid Link exited:', {
      hasError: !!exit.error,
      errorCode: exit.error?.error_code,
      errorMessage: exit.error?.error_message,
      errorType: exit.error?.error_type,
      retryCount: retryCount
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
      
      // FIX: PLAID RETRY - Retry with fresh link token on certain errors
      const retryableErrors = ['ITEM_LOGIN_REQUIRED', 'INVALID_LINK_TOKEN', 'EXPIRED_LINK_TOKEN'];
      const shouldRetry = retryableErrors.includes(errorCode) && retryCount < MAX_RETRIES;
      
      if (shouldRetry) {
        console.log('[PLAID-MOBILE] Retrying with fresh link token...');
        setTimeout(() => retryPlaidLink(), 1000); // Small delay before retry
      } else {
        // Send error to WebView
        webViewRef.current?.postMessage(JSON.stringify({
          type: 'PLAID_ERROR',
          error: errorMessage,
          errorCode: errorCode
        }));
        
        // Reset retry count for next attempt
        setRetryCount(0);
      }
    } else {
      // User cancelled
      console.log('[PLAID-MOBILE] User cancelled Plaid Link');
      webViewRef.current?.postMessage(JSON.stringify({
        type: 'PLAID_EXIT',
      }));
      
      // Reset retry count
      setRetryCount(0);
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
    
    // Check if this is an external link that should open in in-app browser
    if (shouldOpenExternally(url)) {
      // Prevent WebView from loading this URL
      webViewRef.current?.stopLoading();
      
      // APPSTORE: Open in in-app browser instead of Safari (Guideline 4.0 - better UX)
      WebBrowser.openBrowserAsync(url, {
        // iOS: Use SafariViewController for in-app browsing
        // Android: Use Custom Tabs for in-app browsing
        dismissButtonStyle: 'close',
        controlsColor: '#8B5CF6', // PocketTrack brand color
        toolbarColor: '#0a0a0a', // Dark toolbar
      });
      
      return false;
    }
    
    return true;
  };

  // APPSTORE: Determine if URL should open in in-app browser (Guideline 4.0 - all content stays in app)
  const shouldOpenExternally = (url) => {
    // Don't intercept our own domain
    if (url.startsWith(POCKETTRACK_URL)) {
      return false;
    }
    
    // APPSTORE: Keep Replit Auth in WebView for iOS compliance (Guideline 4.0)
    // Auth flows must stay inside the app, not open external browser
    if (url.includes('auth.replit.com') || 
        url.includes('replit.com/auth') ||
        url.includes('id.replit.com')) {
      console.log('[MOBILE] Keeping Replit Auth in WebView:', url);
      return false;
    }
    
    // FIX: PLAID - Keep ALL Plaid URLs in WebView (critical for Plaid Link to work)
    if (url.includes('cdn.plaid.com') || 
        url.includes('link.plaid.com') || 
        url.includes('.plaid.com')) {
      console.log('[MOBILE] Keeping Plaid URL in WebView:', url);
      return false;
    }
    
    // APPSTORE: Open Stripe checkout in in-app browser (not Safari)
    if (url.includes('checkout.stripe.com') || 
        url.includes('id.stripe.com') ||
        url.includes('billing.stripe.com') ||
        url.includes('/billing/checkout')) {
      console.log('[MOBILE] Opening Stripe in in-app browser:', url);
      return true;
    }
    
    // APPSTORE: Open bank OAuth in in-app browser (not Safari)
    if (url.includes('/oauth/') || 
        url.includes('/auth/authorize') || 
        url.includes('/signin') || 
        url.includes('/login')) {
      // But not our own login pages
      if (url.startsWith(POCKETTRACK_URL)) {
        return false;
      }
      console.log('[MOBILE] Opening bank OAuth in in-app browser:', url);
      return true;
    }
    
    // APPSTORE: Open cancellation links in in-app browser (Guideline 4.0 - better UX)
    if (url.includes('/cancel') && !url.startsWith(POCKETTRACK_URL)) {
      console.log('[MOBILE] Opening cancellation link in in-app browser:', url);
      return true;
    }
    
    // APPSTORE: Open privacy policy links in in-app browser (Plaid, Stripe, Replit)
    const privacyDomains = ['plaid.com/legal', 'stripe.com/privacy', 'replit.com/site/privacy'];
    if (privacyDomains.some(domain => url.includes(domain))) {
      console.log('[MOBILE] Opening privacy policy in in-app browser:', url);
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
    
    // APPSTORE: Open other external domains in in-app browser (not Safari)
    if (url.startsWith('http') && !url.startsWith(POCKETTRACK_URL)) {
      console.log('[MOBILE] Opening external link in in-app browser:', url);
      return true;
    }
    
    return false;
  };

  // Handle links that try to open in new window
  const handleShouldStartLoadWithRequest = (request) => {
    const { url } = request;
    
    // Check if should open in in-app browser
    if (shouldOpenExternally(url)) {
      // APPSTORE: Open in in-app browser instead of Safari (Guideline 4.0 - better UX)
      WebBrowser.openBrowserAsync(url, {
        // iOS: Use SafariViewController for in-app browsing
        // Android: Use Custom Tabs for in-app browsing
        dismissButtonStyle: 'close',
        controlsColor: '#8B5CF6', // PocketTrack brand color
        toolbarColor: '#0a0a0a', // Dark toolbar
      });
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

  // FIX: LOADING - Handle WebView loading events
  const handleLoadStart = () => {
    console.log('[MOBILE] WebView started loading');
    setIsLoading(true);
    setLoadProgress(0);
  };

  const handleLoadProgress = (event) => {
    const progress = event.nativeEvent.progress;
    console.log('[MOBILE] WebView loading progress:', Math.round(progress * 100) + '%');
    setLoadProgress(progress);
  };

  const handleLoadEnd = () => {
    console.log('[MOBILE] WebView finished loading');
    setIsLoading(false);
    setLoadProgress(1);
  };

  // Handle Subscribe button press
  const handleSubscribePress = () => {
    console.log('[MOBILE] Opening subscribe page in system browser');
    // Open in system browser (Safari/Chrome) not in-app browser
    Linking.openURL('https://pockettrackapp.replit.app/subscribe');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      {/* FIX: LOADING - Show loading screen while WebView loads */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Loading PocketTrack...</Text>
            {loadProgress > 0 && loadProgress < 1 && (
              <Text style={styles.loadingProgress}>
                {Math.round(loadProgress * 100)}%
              </Text>
            )}
          </View>
        </View>
      )}
      
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
      
      {/* Main content area - WebView takes available space */}
      <View style={styles.contentContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: webViewUrl }}
          style={styles.webview}
          onNavigationStateChange={handleNavigationStateChange}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
          onMessage={handleWebViewMessage}
          injectedJavaScript={injectedJavaScript}
          injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
          // FIX: LOADING - Track loading state
          onLoadStart={handleLoadStart}
          onLoadProgress={handleLoadProgress}
          onLoadEnd={handleLoadEnd}
          // FIX: SMART CACHING - Enable caching for resources (JS, CSS, images) while cache-busting HTML
          cacheEnabled={true}
          cacheMode="LOAD_DEFAULT"
          // Enable JavaScript
          javaScriptEnabled={true}
          // Enable DOM storage (for localStorage, sessionStorage)
          domStorageEnabled={true}
          // FIX: PLAID RELIABILITY - Enable cookie sharing for iOS
          sharedCookiesEnabled={true}
          // Allow third-party cookies (needed for auth and Plaid)
          thirdPartyCookiesEnabled={true}
          // FIX: PLAID RELIABILITY - Prevent new windows from opening (keep everything in WebView)
          setSupportMultipleWindows={false}
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
      </View>

      {/* Subscribe button bar - fixed at bottom above iOS home indicator */}
      <View style={styles.subscribeBar}>
        <TouchableOpacity 
          style={styles.subscribeButton}
          onPress={handleSubscribePress}
          activeOpacity={0.8}
        >
          <Text style={styles.subscribeButtonText}>Subscribe for updates</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  contentContainer: {
    flex: 1, // Takes all available space above the subscribe bar
  },
  webview: {
    flex: 1,
  },
  subscribeBar: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    // Ensures it stays above iOS home indicator
    paddingBottom: Platform.OS === 'ios' ? 12 : 12,
  },
  subscribeButton: {
    backgroundColor: '#3b82f6', // Blue branding
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    // Subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3, // Android shadow
  },
  subscribeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0a0a0a',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  loadingProgress: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
});
