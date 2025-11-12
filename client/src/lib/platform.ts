// APPSTORE: Platform detection for iOS App Store compliance
// Used to hide external payment links and modify auth flow on iOS

export interface PlatformInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isWebView: boolean;
  isMobile: boolean;
  isDesktop: boolean;
}

/**
 * Detect if app is running in iOS mobile app (React Native WebView)
 * APPSTORE: Required for Guideline 3.1.1 (hide external payment links)
 */
export function getPlatformInfo(): PlatformInfo {
  // Check if running in React Native WebView
  const isWebView = !!(window as any).ReactNativeWebView || !!(window as any).isReactNativeWebView;
  
  // Check user agent for platform detection
  const userAgent = navigator.userAgent || '';
  const isIOSAgent = /iPhone|iPad|iPod/i.test(userAgent);
  const isAndroidAgent = /Android/i.test(userAgent);
  
  // Detect if running in iOS mobile app
  const isIOS = isWebView && isIOSAgent;
  const isAndroid = isWebView && isAndroidAgent;
  
  // Mobile detection (WebView or mobile browser)
  const isMobile = isWebView || isIOSAgent || isAndroidAgent || /Mobile/i.test(userAgent);
  
  return {
    isIOS,
    isAndroid,
    isWebView,
    isMobile,
    isDesktop: !isMobile,
  };
}

/**
 * Check if app is running in iOS mobile app
 * APPSTORE: Use this to conditionally hide Stripe payment links
 */
export function isIOSApp(): boolean {
  return getPlatformInfo().isIOS;
}

/**
 * Check if app is running in any mobile WebView (iOS or Android)
 */
export function isWebViewApp(): boolean {
  return getPlatformInfo().isWebView;
}
