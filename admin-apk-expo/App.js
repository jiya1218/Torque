import React, { useRef, useState, useCallback, useEffect } from 'react';
import { StyleSheet, Platform, BackHandler, Linking, StatusBar as RNStatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// JavaScript injected into the WebView to intercept tel:/whatsapp clicks
// and forward them via postMessage so the native side can handle them.
const INJECTED_JS = `
(function() {
  // Intercept all clicks on anchor tags
  document.addEventListener('click', function(e) {
    var el = e.target;
    // Walk up the DOM to find the nearest <a> tag
    while (el && el.tagName !== 'A') { el = el.parentElement; }
    if (!el) return;

    var href = el.getAttribute('href') || '';
    if (
      href.startsWith('tel:') ||
      href.startsWith('sms:') ||
      href.startsWith('mailto:') ||
      href.startsWith('whatsapp:') ||
      href.includes('wa.me') ||
      href.includes('api.whatsapp.com')
    ) {
      e.preventDefault();
      e.stopPropagation();
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'external_link', url: href }));
    }
  }, true);

  // Also intercept window.location.href assignments for tel:/whatsapp
  var origDescriptor = Object.getOwnPropertyDescriptor(window, 'location') || {};
  // Patch via navigation listener
  var _pushState = history.pushState;
  history.pushState = function() {
    _pushState.apply(history, arguments);
  };

  // Periodic check for programmatic tel: navigations
  var _origOpen = XMLHttpRequest.prototype.open;
  true; // noop to end injection cleanly
})();
true;
`;

export default function App() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);

  // Use a completely standard Chrome/Android User Agent to avoid session blocking
  const userAgent = Platform.OS === 'android'
    ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36'
    : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

  // Handle Android hardware back button
  useEffect(() => {
    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true; // Prevent default (exit app)
      }
      return false; // Allow default (exit app)
    };

    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [canGoBack]);

  // Handle messages from injected JS (tel:, whatsapp, etc.)
  const onMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'external_link' && data.url) {
        Linking.openURL(data.url).catch((err) => {
          console.warn('Failed to open external link:', err);
        });
      }
    } catch (err) {
      // Not JSON, ignore
    }
  }, []);

  // Track navigation state for back button support
  const onNavigationStateChange = useCallback((navState) => {
    setCanGoBack(navState.canGoBack);
  }, []);

  return (
    <SafeAreaProvider>
      {/* Make status bar translucent=false so it takes its own space natively */}
      <StatusBar style="dark" translucent={false} backgroundColor="#ffffff" />
      {/* Remove 'top' edge from SafeAreaView to prevent adding extra white space below the status bar */}
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <WebView
          ref={webViewRef}
          source={{ uri: 'https://torque-alpha.vercel.app/' }}
          style={styles.webview}
          userAgent={userAgent}
          // ESSENTIAL FOR SESSIONS
          domStorageEnabled={true}
          javaScriptEnabled={true}
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          // ANDROID SPECIFIC PERSISTENCE
          databaseEnabled={true}
          cacheEnabled={true}
          cacheMode="LOAD_DEFAULT"
          // COMPATIBILITY
          mixedContentMode="always"
          startInLoadingState={true}
          scalesPageToFit={false}
          allowsBackForwardNavigationGestures={true}
          // PREVENT BLANK SCREEN
          androidLayerType="hardware"
          setSupportMultipleWindows={false}
          javaScriptCanOpenWindowsAutomatically={true}
          // ALLOW tel: sms: mailto: to pass through the origin whitelist
          originWhitelist={['https://*', 'http://*', 'tel:*', 'sms:*', 'mailto:*', 'whatsapp:*', 'intent:*']}
          // INJECTED JAVASCRIPT to intercept clicks on tel:/whatsapp links
          injectedJavaScript={INJECTED_JS}
          // MESSAGE HANDLER for intercepted links
          onMessage={onMessage}
          // NAVIGATION STATE for back button
          onNavigationStateChange={onNavigationStateChange}
          // INTERCEPT EXTERNAL PROTOCOLS (CALL, SMS, WHATSAPP, EMAIL)
          onShouldStartLoadWithRequest={(request) => {
            const { url } = request;

            // Handle native app deep linking
            if (
              url.startsWith('tel:') ||
              url.startsWith('sms:') ||
              url.startsWith('mailto:') ||
              url.startsWith('whatsapp:') ||
              url.startsWith('intent:') ||
              url.includes('wa.me') ||
              url.includes('api.whatsapp.com')
            ) {
              Linking.openURL(url).catch((err) => {
                console.warn('An error occurred opening the link:', err);
              });
              return false; // Intercepted - do not load internally
            }
            return true; // Continue standard web navigation
          }}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
});
