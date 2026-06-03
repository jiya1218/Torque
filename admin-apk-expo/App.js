import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Platform, StatusBar as RNStatusBar, Linking, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

function MainApp() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const insets = useSafeAreaInsets();

  // Top spacing based on platform to prevent overlays
  const topPadding = Platform.OS === 'ios' ? insets.top : (RNStatusBar.currentHeight ?? 24);

  // Handle hardware back button press on Android
  useEffect(() => {
    const onBackPress = () => {
      if (webViewRef.current && canGoBack) {
        webViewRef.current.goBack();
        return true; // Intercept and navigate back in WebView history
      }
      return false; // Let OS handle back press (exit app)
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => {
      subscription.remove();
    };
  }, [canGoBack]);

  // Use a completely standard Chrome/Android User Agent to avoid session blocking
  const userAgent = Platform.OS === 'android'
    ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36'
    : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

  // Deep link launcher with WhatsApp scheme converter
  const launchNativeURL = (url) => {
    if (!url || typeof url !== 'string') return;
    let targetUrl = url;
    
    // If it's a WhatsApp web/HTTP link, rewrite to whatsapp:// send scheme for mobile apps
    if (url.includes('api.whatsapp.com/send') || url.includes('wa.me')) {
      const phoneMatch = url.match(/[?&]phone=([^&]+)/);
      const textMatch = url.match(/[?&]text=([^&]+)/);
      const phone = phoneMatch ? phoneMatch[1] : '';
      const text = textMatch ? textMatch[2] : '';
      
      if (url.includes('wa.me/')) {
        const pathPhoneMatch = url.match(/wa\.me\/([0-9]+)/);
        const pathPhone = pathPhoneMatch ? pathPhoneMatch[1] : '';
        targetUrl = `whatsapp://send?phone=${pathPhone}&text=${text}`;
      } else {
        targetUrl = `whatsapp://send?phone=${phone}&text=${text}`;
      }
    }

    Linking.openURL(targetUrl).catch((err) => {
      // If launching deep link fails (e.g. WhatsApp app not installed), try opening HTTP link in external browser
      if (targetUrl.startsWith('whatsapp://')) {
        Linking.openURL(url).catch((e) => console.warn('Failed fallback to web link:', e));
      } else {
        console.warn('An error occurred opening the link:', err);
      }
    });
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding, paddingBottom: insets.bottom }]}>
      {/* Make status bar translucent and transparent so content/header flows to the top under it */}
      <StatusBar style="dark" translucent={true} backgroundColor="transparent" />
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
        // DISABLE ZOOM CONTROLS FOR NATIVE APP FEEL
        builtInZoomControls={false}
        displayZoomControls={false}
        // UPDATE NAVIGATION STATUS FOR BACK BUTTON
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
        }}
        // INTERCEPT EXTERNAL PROTOCOLS (CALL, SMS, WHATSAPP, EMAIL)
        onShouldStartLoadWithRequest={(request) => {
          const url = request?.url;
          if (!url) return true;
          
          if (
            url.startsWith('tel:') ||
            url.startsWith('sms:') ||
            url.startsWith('mailto:') ||
            url.startsWith('whatsapp:') ||
            url.includes('wa.me') ||
            url.includes('api.whatsapp.com')
          ) {
            launchNativeURL(url);
            return false; // Intercepted - do not load internally
          }
          return true; // Continue standard web navigation
        }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'open_url' && data.url) {
              launchNativeURL(data.url);
            }
          } catch (e) {
            console.warn('Failed to parse onMessage data:', e);
          }
        }}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
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
