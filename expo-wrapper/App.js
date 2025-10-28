import React, { useRef } from 'react';
import { StyleSheet, SafeAreaView, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';

// TODO: Replace with your actual PocketTrack URL
const POCKETTRACK_URL = 'https://your-replit-url.replit.app';

export default function App() {
  const webViewRef = useRef(null);

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

  // Determine if URL should open in external browser
  const shouldOpenExternally = (url) => {
    // Plaid links
    if (url.includes('plaid.com')) {
      return true;
    }
    
    // Stripe checkout and billing links
    if (url.includes('checkout.stripe.com') || url.includes('/billing/checkout')) {
      return true;
    }
    
    // Add other external domains as needed
    // if (url.includes('example.com')) {
    //   return true;
    // }
    
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <WebView
        ref={webViewRef}
        source={{ uri: POCKETTRACK_URL }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
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
        // User agent (optional: make it look like native app)
        userAgent={Platform.select({
          ios: 'PocketTrack-iOS/1.0',
          android: 'PocketTrack-Android/1.0',
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
