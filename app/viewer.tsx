import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors, FontFamilies } from '../constants/theme';

export default function ViewerScreen() {
  const { url, title } = useLocalSearchParams<{ url: string; title: string }>();
  const [loading, setLoading] = useState(true);
  const isPlaque = (title || '').includes('菌斑');

  const accentColor = isPlaque ? '#239dca' : '#03695e';
  const accentLight = isPlaque ? '#5bbcd4' : '#6daf5f';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #111d1a;
      width: 100vw; height: 100vh;
      overflow: hidden;
    }
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image: radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px);
      background-size: 28px 28px;
      pointer-events: none;
      z-index: 0;
    }
    body::after {
      content: '';
      position: fixed;
      width: 340px; height: 340px;
      border-radius: 50%;
      background: radial-gradient(circle, ${accentColor}22 0%, transparent 70%);
      top: 50%; left: 50%;
      transform: translate(-50%, -60%);
      pointer-events: none;
      z-index: 0;
    }
    model-viewer {
      width: 100vw;
      height: 100vh;
      background: transparent;
      --poster-color: transparent;
      position: relative;
      z-index: 1;
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
    auto-rotate-delay="800"
    rotation-per-second="18deg"
    environment-image="neutral"
    shadow-intensity="0.6"
    exposure="0.9"
    tone-mapping="commerce"
    min-camera-orbit="auto auto 0%"
    max-camera-orbit="auto auto 250%"
    interpolation-decay="200"
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
        onLoadEnd={() => setLoading(false)}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingRing, { borderColor: accentColor + '40' }]}>
            <ActivityIndicator size="large" color={accentColor} />
          </View>
          <Text style={[styles.loadingText, { color: accentColor }]}>載入 3D 模型中...</Text>
        </View>
      )}

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.header}>
          <Pressable style={styles.closeBtn} onPress={() => router.back()}>
            <Feather name="x" size={18} color={Colors.white} />
          </Pressable>
          <View style={styles.titleWrap}>
            <View style={[styles.titleDot, { backgroundColor: accentLight }]} />
            <Text style={styles.headerTitle}>{title || '3D 牙齒模型'}</Text>
          </View>
          <View style={{ width: 42 }} />
        </View>

        <View style={styles.bottomBar}>
          <View style={styles.hintPill}>
            <Feather name="rotate-ccw" size={12} color="rgba(255,255,255,0.55)" />
            <Text style={styles.hintText}>拖曳旋轉</Text>
            <View style={styles.hintDivider} />
            <Feather name="maximize-2" size={12} color="rgba(255,255,255,0.55)" />
            <Text style={styles.hintText}>捏合縮放</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111d1a' },
  webview:   { flex: 1, backgroundColor: 'transparent' },

  loadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#111d1a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  loadingRing: {
    width: 80, height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: FontFamilies.body,
    fontSize: 14,
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
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: 'rgba(17,29,26,0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  closeBtn: {
    width: 42, height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleDot: {
    width: 7, height: 7,
    borderRadius: 4,
  },
  headerTitle: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 16,
    color: Colors.white,
    letterSpacing: 0.3,
  },

  bottomBar: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.50)',
    borderRadius: 99,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  hintDivider: {
    width: 1, height: 12,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  hintText: {
    fontFamily: FontFamilies.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
});
