// CAP: Capacitor configuration for PocketTrack mobile apps
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // CAP: App identifier - use reverse domain name notation
  appId: 'app.pockettrack.mobile',
  
  // CAP: App name as displayed on device
  appName: 'PocketTrack',
  
  // CAP: Web assets directory (Vite builds to dist/public)
  webDir: 'dist/public',
  
  // CAP: Server configuration for development
  server: {
    // CAP: Production URL - change to your deployed domain
    url: 'https://pockettrack.app',
    
    // CAP: Clear text traffic allowed for localhost development
    cleartext: true,
    
    // CAP: Allow navigation to external domains (Plaid, Stripe)
    allowNavigation: [
      'pockettrack.app',
      '*.plaid.com',
      'checkout.stripe.com',
      '*.stripe.com'
    ]
  },
  
  // CAP: iOS specific configuration
  ios: {
    // CAP: Content mode for webview
    contentInset: 'automatic',
    
    // CAP: URL schemes for deep linking
    scheme: 'pockettrack'
  },
  
  // CAP: Android specific configuration
  android: {
    // CAP: URL schemes for deep linking
    scheme: 'https',
    
    // CAP: Allow mixed content (http/https)
    allowMixedContent: true,
    
    // CAP: Background color while app loads
    backgroundColor: '#0f172a'
  },
  
  // CAP: Plugin configurations
  plugins: {
    // CAP: Browser plugin - opens external URLs in system browser
    Browser: {
      // CAP: Use SFSafariViewController on iOS, Custom Tabs on Android
      presentationStyle: 'popover',
      
      // CAP: Show browser controls
      toolbarColor: '#0f172a'
    }
  }
};

export default config;
