import React from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors, FontFamilies } from '../constants/theme';

export default function ViewerScreen() {
  const { url, title } = useLocalSearchParams<{ url: string; title: string }>();

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #1a2420; width: 100vw; height: 100vh; overflow: hidden; }
    model-viewer {
      width: 100vw;
      height: 100vh;
      background: linear-gradient(135deg, #1a2420 0%, #0e3530 50%, #03695e22 100%);
    }
  </style>
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"></script>
</head>
<body>
  <model-viewer
    src="${url}"
    alt="3D 牙齒模型"
    camera-controls
    auto-rotate
    auto-rotate-delay="1000"
    rotation-per-second="20deg"
    environment-image="neutral"
    shadow-intensity="1"
    exposure="0.8"
    tone-mapping="commerce"
    min-camera-orbit="auto auto 0%"
    max-camera-orbit="auto auto 200%"
  ></model-viewer>
</body>
</html>`;

  return (
    <View style={styles.container}>
      <WebView
        source={{ html }}
        style={styles.webview}
        originWhitelist={['*']}
        allowFileAccess
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loadingWrap}>
            <Feather name="rotate-cw" size={32} color={Colors.jade} />
            <Text style={styles.loadingText}>載入 3D 模型中...</Text>
          </View>
        )}
      />
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.header}>
          <Pressable style={styles.closeBtn} onPress={() => router.back()}>
            <Feather name="x" size={20} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>{title || '3D 牙齒模型'}</Text>
          <View style={{ width: 42 }} />
        </View>
        <View style={styles.hint}>
          <Feather name="rotate-ccw" size={13} color="rgba(255,255,255,0.6)" />
          <Text style={styles.hintText}>拖曳旋轉 · 捏合縮放</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2420' },
  webview: { flex: 1 },
  loadingWrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#1a2420',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontFamily: FontFamilies.body,
    fontSize: 15,
    color: Colors.jade,
  },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: 'rgba(26,36,32,0.7)',
  },
  closeBtn: {
    width: 42, height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 16,
    color: Colors.white,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 24,
  },
  hintText: {
    fontFamily: FontFamilies.body,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
  },
});
