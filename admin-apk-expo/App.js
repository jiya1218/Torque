import React from 'react';
import { StyleSheet, View, Platform, StatusBar as RNStatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  // Use a completely standard Chrome/Android User Agent to avoid session blocking
  const userAgent = Platform.OS === 'android'
    ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36'
    : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

  return (
    <SafeAreaProvider>
      {/* Make status bar translucent=false so it takes its own space */}
      <StatusBar style="dark" translucent={false} backgroundColor="#ffffff" />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <WebView
          source={{ uri: 'https://toruqfinal-admin-panel.vercel.app/login' }}
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
          scalesPageToFit={true}
          allowsBackForwardNavigationGestures={true}
          // PREVENT BLANK SCREEN
          androidLayerType="hardware"
          setSupportMultipleWindows={false}
          javaScriptCanOpenWindowsAutomatically={true}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    // Fallback: manually pad top by status bar height on Android
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 0 : 0,
  },
  webview: {
    flex: 1,
  },
});
