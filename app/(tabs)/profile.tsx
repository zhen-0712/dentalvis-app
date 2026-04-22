import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Radius, Shadows, FontFamilies, Gradients } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { fetchAnalyses, getFileUrl } from '../../services/api';
import { exportMonthlyReport, SnapItem } from '../../services/report';

type InfoRow  = { icon: keyof typeof Feather.glyphMap; label: string; value: string };
type CapPhase = 'idle' | 'capturing' | 'pdf';

// Captures 5 plaque model angles sequentially, postMessages JSON SnapItem[]
function makeMultiAngleSnapshotHtml(glbUrl: string) {
  return `<!DOCTYPE html>
<html><head>
  <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#f4f5f0; width:100vw; height:100vh; overflow:hidden; }
    model-viewer { width:100vw; height:100vh; background:#f4f5f0; --poster-color:#f4f5f0; }
  </style>
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"></script>
</head>
<body>
  <model-viewer id="mv"
    src="${glbUrl}"
    field-of-view="38deg"
    environment-image="neutral"
    shadow-intensity="1"
    exposure="1.0"
    tone-mapping="commerce"
  ></model-viewer>
  <script>
    const mv = document.getElementById('mv');
    const ANGLES = [
      { label: '左側',   orbit: '90deg 75deg auto',  fov: '34deg' },
      { label: '右側',   orbit: '270deg 75deg auto', fov: '34deg' },
      { label: '正面',   orbit: '0deg 75deg auto',   fov: '34deg' },
      { label: '上俯視', orbit: '0deg 5deg auto',    fov: '38deg' },
      { label: '下俯視', orbit: '0deg 175deg auto',  fov: '38deg' },
    ];
    let sent = false;
    function send(d) { if (!sent) { sent = true; window.ReactNativeWebView.postMessage(JSON.stringify(d)); } }
    mv.addEventListener('load', async () => {
      await new Promise(r => setTimeout(r, 1200));
      const results = [];
      for (const { label, orbit, fov } of ANGLES) {
        mv.setAttribute('camera-orbit', orbit);
        mv.setAttribute('field-of-view', fov);
        await new Promise(r => setTimeout(r, 950));
        try {
          const blob = await mv.toBlob({ idealAspect: false });
          const img = await new Promise((res, rej) => {
            const fr = new FileReader();
            fr.onload = () => res(fr.result);
            fr.onerror = rej;
            fr.readAsDataURL(blob);
          });
          results.push({ label, img });
        } catch(e) {
          results.push({ label, img: null });
        }
      }
      send(results);
    });
    setTimeout(() => send([]), 38000);
  </script>
</body></html>`;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [exporting,    setExporting]    = useState(false);
  const [capturePhase, setCapturePhase] = useState<CapPhase>('idle');
  const [plaqueUrl,    setPlaqueUrl]    = useState('');
  const [snapshots,    setSnapshots]    = useState<SnapItem[]>([]);
  const analysesRef = useRef<any[]>([]);

  // Watch capturePhase → when 'pdf', generate the document
  useEffect(() => {
    if (capturePhase !== 'pdf') return;
    exportMonthlyReport(analysesRef.current, snapshots.length > 0 ? snapshots : null)
      .catch((e: any) => Alert.alert('匯出失敗', e.message || '請稍後再試'))
      .finally(() => {
        setCapturePhase('idle');
        setSnapshots([]);
        setPlaqueUrl('');
        setExporting(false);
      });
  }, [capturePhase]);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const analyses = await fetchAnalyses();
      analysesRef.current = analyses;

      const pUrl = await getFileUrl('plaque_by_fdi.glb').catch(() => '');
      if (pUrl) {
        setPlaqueUrl(pUrl);
        setCapturePhase('capturing');
      } else {
        await exportMonthlyReport(analyses, null);
        setExporting(false);
      }
    } catch (e: any) {
      Alert.alert('匯出失敗', e.message || '請稍後再試');
      setExporting(false);
    }
  };

  const onSnapshotMessage = (e: any) => {
    try {
      const parsed: SnapItem[] = JSON.parse(e.nativeEvent.data);
      const valid = parsed.filter(s => s.img && typeof s.img === 'string' && s.img.startsWith('data:image'));
      setSnapshots(valid);
    } catch {
      setSnapshots([]);
    }
    setCapturePhase('pdf');
  };

  const handleLogout = () =>
    Alert.alert('登出', '確定要登出嗎？', [
      { text: '取消', style: 'cancel' },
      { text: '登出', style: 'destructive', onPress: async () => { await logout(); } },
    ]);

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.guestWrap}>
          <LinearGradient colors={Gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.guestIconWrap}>
            <Feather name="user" size={32} color={Colors.white} />
          </LinearGradient>
          <Text style={styles.guestTitle}>尚未登入</Text>
          <Text style={styles.guestDesc}>登入後可儲存分析記錄、查看歷史趨勢</Text>
          <LinearGradient colors={Gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.primaryBtnGrad}>
            <Pressable style={styles.primaryBtnInner} onPress={() => router.push('/(auth)/login')}>
              <Feather name="log-in" size={16} color={Colors.white} />
              <Text style={styles.primaryBtnText}>登入</Text>
            </Pressable>
          </LinearGradient>
          <Pressable style={styles.outlineBtn} onPress={() => router.push('/(auth)/register')}>
            <Feather name="user-plus" size={16} color={Colors.jade} />
            <Text style={styles.outlineBtnText}>建立帳號</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const infoRows: InfoRow[] = [
    { icon: 'user',     label: '姓名',   value: user.name },
    { icon: 'mail',     label: 'Email',  value: user.email },
    { icon: 'calendar', label: '加入日期', value: new Date(user.created_at).toLocaleDateString('zh-TW') },
  ];

  const captureLabel =
    capturePhase === 'capturing' ? '截取 3D 模型（5 個角度）…' : '產出 PDF…';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>我的帳號</Text>

        {/* Avatar Card */}
        <View style={styles.profileCard}>
          <LinearGradient colors={Gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.cardBanner}>
            <View style={styles.bannerDeco1} />
            <View style={styles.bannerDeco2} />
          </LinearGradient>
          <View style={styles.avatarWrap}>
            <LinearGradient colors={Gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.avatar}>
              <Text style={styles.avatarText}>{user.name[0].toUpperCase()}</Text>
            </LinearGradient>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
        </View>

        {/* Info List */}
        <View style={styles.infoList}>
          {infoRows.map((row, i) => (
            <View key={row.label} style={[styles.infoRow, i < infoRows.length - 1 && styles.infoRowBorder]}>
              <View style={styles.infoIconWrap}>
                <Feather name={row.icon} size={14} color={Colors.jade} />
              </View>
              <Text style={styles.infoLabel}>{row.label}</Text>
              <Text style={styles.infoValue} numberOfLines={1}
                adjustsFontSizeToFit minimumFontScale={0.75}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* PDF Report */}
        <Pressable style={styles.reportBtn} onPress={handleExportPDF} disabled={exporting}>
          {exporting
            ? <ActivityIndicator size={16} color={Colors.jade} />
            : <Feather name="file-text" size={16} color={Colors.jade} />}
          <Text style={styles.reportBtnText}>
            {exporting ? captureLabel : '匯出月度報告 PDF'}
          </Text>
        </Pressable>

        {/* Logout */}
        <Pressable style={styles.dangerBtn} onPress={handleLogout}>
          <Feather name="log-out" size={16} color={Colors.redPlaque} />
          <Text style={styles.dangerBtnText}>登出</Text>
        </Pressable>

        <Text style={styles.footer}>DentalVis © 2026 · NCU Dental AI Lab</Text>
      </ScrollView>

      {/* ===== Capture Overlay ===== */}
      {capturePhase !== 'idle' && capturePhase !== 'pdf' && (
        <View style={StyleSheet.absoluteFillObject}>
          {/* WebView renders at full size so WebGL GPU context is active */}
          {capturePhase === 'capturing' && !!plaqueUrl && (
            <WebView
              key="wv_plaque"
              source={{ html: makeMultiAngleSnapshotHtml(plaqueUrl) }}
              style={StyleSheet.absoluteFillObject}
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
              onMessage={onSnapshotMessage}
            />
          )}

          {/* Opaque card on top — hides WebView from user */}
          <View style={styles.captureCard}>
            <LinearGradient colors={Gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.captureIconWrap}>
              <Feather name="box" size={24} color={Colors.white} />
            </LinearGradient>
            <Text style={styles.captureTitle}>準備月度報告</Text>
            <Text style={styles.captureSub}>{captureLabel}</Text>
            <ActivityIndicator color={Colors.jade} style={{ marginTop: 20 }} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: 20, paddingBottom: 52 },

  // Guest
  guestWrap: { flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 40 },
  guestIconWrap: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 8, ...Shadows.hero },
  guestTitle:    { fontFamily: FontFamilies.display, fontSize: 26, color: Colors.ink },
  guestDesc:     { fontFamily: FontFamilies.body,    fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22 },
  primaryBtnGrad:  { width: '100%', borderRadius: Radius.xl, marginTop: 8, ...Shadows.md },
  primaryBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  primaryBtnText:  { fontFamily: FontFamilies.bodyMed, fontSize: 16, color: Colors.white },
  outlineBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', paddingVertical: 15, borderRadius: Radius.xl, borderWidth: 1.5, borderColor: Colors.jade, justifyContent: 'center' },
  outlineBtnText:  { fontFamily: FontFamilies.bodyMed, fontSize: 16, color: Colors.jade },

  // Logged in
  pageTitle: { fontFamily: FontFamilies.heading, fontSize: 32, color: Colors.ink, marginBottom: 24 },
  profileCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, marginBottom: 16, borderWidth: 1, borderColor: Colors.jadeAlpha08, overflow: 'hidden', alignItems: 'center', ...Shadows.md },
  cardBanner:  { width: '100%', height: 110, overflow: 'hidden' },
  bannerDeco1: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.08)', top: -60, right: -30 },
  bannerDeco2: { position: 'absolute', width: 100, height: 100, borderRadius: 50,  backgroundColor: 'rgba(255,255,255,0.06)', top: -20, left: 20 },
  avatarWrap:  { marginTop: -44, borderWidth: 3, borderColor: Colors.white, borderRadius: 48, ...Shadows.md },
  avatar:      { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontFamily: FontFamilies.display, fontSize: 38, color: Colors.white },
  userName:    { fontFamily: FontFamilies.display, fontSize: 26, color: Colors.ink, marginTop: 14, marginBottom: 6 },
  userEmail:   { fontFamily: FontFamilies.body, fontSize: 13, color: Colors.muted, marginBottom: 40, paddingHorizontal: 28, textAlign: 'center', lineHeight: 20 },

  infoList:      { backgroundColor: Colors.white, borderRadius: Radius.md, marginBottom: 20, borderWidth: 1, borderColor: Colors.jadeAlpha08, overflow: 'hidden', ...Shadows.sm },
  infoRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 18, gap: 14 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.jadeAlpha08 },
  infoIconWrap:  { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.jadeAlpha08, alignItems: 'center', justifyContent: 'center' },
  infoLabel:     { fontFamily: FontFamilies.body,    fontSize: 14, color: Colors.muted, flexShrink: 0 },
  infoValue:     { fontFamily: FontFamilies.bodyMed, fontSize: 13, color: Colors.ink,   flex: 1, textAlign: 'right' },

  reportBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: Radius.xl, borderWidth: 1.5, borderColor: Colors.jade, backgroundColor: Colors.jadeAlpha08, marginBottom: 12 },
  reportBtnText: { fontFamily: FontFamilies.bodyMed, fontSize: 15, color: Colors.jade },

  dangerBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: Radius.xl, borderWidth: 1.5, borderColor: Colors.redPlaque, backgroundColor: 'rgba(192,57,43,0.04)', marginBottom: 32 },
  dangerBtnText: { fontFamily: FontFamilies.bodyMed, fontSize: 16, color: Colors.redPlaque },

  footer: { fontFamily: FontFamilies.body, fontSize: 12, color: Colors.linenDark, textAlign: 'center' },

  // Capture overlay
  captureCard: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    gap: 12,
  },
  captureIconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  captureTitle:    { fontFamily: FontFamilies.heading, fontSize: 22, color: Colors.ink },
  captureSub:      { fontFamily: FontFamilies.body,    fontSize: 14, color: Colors.muted },
});
