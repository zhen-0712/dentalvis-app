// ===== 掃描頁面（初始化 + 菌斑分析）=====
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Image,
  Alert, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Shadows, FontFamilies, Gradients } from '../../constants/theme';
import { submitInit, submitPlaque, fetchTaskStatus, fetchModelStatus } from '../../services/api';

const VIEWS = ['front', 'left_side', 'right_side', 'upper_occlusal', 'lower_occlusal'] as const;
type View = typeof VIEWS[number];

const VIEW_LABELS: Record<View, string> = {
  front:          '正面',
  left_side:      '左側面',
  right_side:     '右側面',
  upper_occlusal: '上顎咬合面',
  lower_occlusal: '下顎咬合面',
};

type Mode = 'init' | 'plaque';
type FileMap = Partial<Record<View, { uri: string; name: string; type: string }>>;

const STEPS: Record<string, string> = {
  preprocessing:   '照片前處理中...',
  analyzing:       'AI 分析牙齒中...',
  creating_3d:     '建立 3D 模型中...',
  detecting_plaque:'偵測菌斑中...',
  extracting_regions: '提取菌斑區域...',
  projecting_plaque:  '映射至 3D 模型...',
  done:            '完成！',
};

export default function ScanScreen() {
  const [mode, setMode] = useState<Mode>('init');
  const [files, setFiles] = useState<FileMap>({});
  const [modelReady, setModelReady] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'failed'>('idle');
  const [step, setStep] = useState('');
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchModelStatus().then(d => setModelReady(d.model_ready)).catch(() => {});
  }, []);

  const pickImage = async (view: View) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('權限不足', '請允許 DentalVis 存取相片');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setFiles(prev => ({
        ...prev,
        [view]: { uri: asset.uri, name: `${view}.jpg`, type: 'image/jpeg' },
      }));
    }
  };

  const takePhoto = async (view: View) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('權限不足', '請允許 DentalVis 使用相機');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.9,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setFiles(prev => ({
        ...prev,
        [view]: { uri: asset.uri, name: `${view}.jpg`, type: 'image/jpeg' },
      }));
    }
  };

  const showPickOptions = (view: View) => {
    Alert.alert('選擇照片', undefined, [
      { text: '拍照', onPress: () => takePhoto(view) },
      { text: '從相簿選取', onPress: () => pickImage(view) },
      { text: '取消', style: 'cancel' },
    ]);
  };

  const allFilled = VIEWS.every(v => files[v]);

  const startAnalysis = async () => {
    if (!allFilled) return;
    setStatus('uploading');
    setErrorMsg('');
    try {
      const submitFn = mode === 'init' ? submitInit : submitPlaque;
      const data = await submitFn(files as Record<View, any>);
      if (!data.task_id) throw new Error('伺服器未回傳 task_id');
      setStatus('processing');
      poll(data.task_id);
    } catch (e: any) {
      setStatus('failed');
      setErrorMsg(e.message || '上傳失敗');
    }
  };

  const poll = (taskId: string) => {
    const timer = setInterval(async () => {
      try {
        const data = await fetchTaskStatus(taskId);
        setStep(data.step || '');
        if (data.status === 'done') {
          clearInterval(timer);
          setStatus('done');
          setResult(data.result);
          if (mode === 'init') setModelReady(true);
        } else if (data.status === 'failed') {
          clearInterval(timer);
          setStatus('failed');
          setErrorMsg(data.error || '處理失敗');
        }
      } catch {}
    }, 3000);
  };

  const reset = () => {
    setFiles({});
    setStatus('idle');
    setStep('');
    setResult(null);
    setErrorMsg('');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Text style={styles.pageTitle}>掃描</Text>

        {/* Mode Toggle */}
        <View style={styles.toggleWrap}>
          {(['init', 'plaque'] as Mode[]).map(m => (
            <Pressable
              key={m}
              style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}
              onPress={() => { setMode(m); reset(); }}
            >
              <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
                {m === 'init' ? '初始化模型' : '菌斑分析'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Description */}
        <View style={styles.descCard}>
          <Text style={styles.descEyebrow}>
            {mode === 'init' ? 'Step 01 · 一次性設定' : 'Step 02 · 可重複執行'}
          </Text>
          <Text style={styles.descTitle}>
            {mode === 'init' ? '建立個人化 3D 模型' : '牙菌斑分析'}
          </Text>
          <Text style={styles.descBody}>
            {mode === 'init'
              ? '上傳五個角度的清晰牙齒照片，系統將建立專屬的 3D 牙齒模型。完成後即可重複進行菌斑分析。'
              : '上傳塗抹染色劑後拍攝的五角度照片，系統將菌斑標示在你的個人化 3D 模型上。'}
          </Text>
          {mode === 'plaque' && !modelReady && (
            <Text style={styles.warnText}>⚠️ 請先完成初始化再進行菌斑分析</Text>
          )}
        </View>

        {/* Upload Grid */}
        {status === 'idle' && (
          <>
            <View style={styles.uploadGrid}>
              {VIEWS.map(view => {
                const file = files[view];
                return (
                  <Pressable key={view} style={styles.uploadCard} onPress={() => showPickOptions(view)}>
                    {file ? (
                      <>
                        <Image source={{ uri: file.uri }} style={styles.preview} />
                        <View style={styles.previewOverlay}>
                          <Text style={styles.previewLabel}>{VIEW_LABELS[view]}</Text>
                          <Text style={styles.previewChange}>點擊更換</Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.uploadPlaceholder}>
                        <Text style={styles.uploadPlaceholderIcon}>📷</Text>
                        <Text style={styles.uploadLabel}>{VIEW_LABELS[view]}</Text>
                        <Text style={styles.uploadHint}>點擊上傳</Text>
                      </View>
                    )}
                    {file && <View style={styles.checkMark}><Text style={{ color: '#fff', fontSize: 12 }}>✓</Text></View>}
                  </Pressable>
                );
              })}
            </View>

            <LinearGradient
              colors={mode === 'init' ? Gradients.primary : Gradients.plaque}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.submitBtn, !allFilled && styles.submitBtnDisabled]}
            >
              <Pressable
                style={styles.submitBtnInner}
                onPress={startAnalysis}
                disabled={!allFilled || (mode === 'plaque' && !modelReady)}
              >
                <Text style={styles.submitBtnText}>
                  {mode === 'init' ? '建立我的 3D 模型' : '開始菌斑分析'}
                </Text>
                <Text style={styles.submitBtnSub}>
                  {mode === 'init' ? '約需 3–8 分鐘，僅需執行一次' : '約需 2–5 分鐘'}
                </Text>
              </Pressable>
            </LinearGradient>
          </>
        )}

        {/* Upload Progress */}
        {status === 'uploading' && (
          <View style={styles.progressCard}>
            <ActivityIndicator size="large" color={Colors.jade} />
            <Text style={styles.progressTitle}>上傳照片中...</Text>
          </View>
        )}

        {/* Processing Progress */}
        {status === 'processing' && (
          <View style={styles.progressCard}>
            <ActivityIndicator size="large" color={Colors.jade} />
            <Text style={styles.progressTitle}>AI 處理中</Text>
            <Text style={styles.progressStep}>{STEPS[step] || `${step}...`}</Text>
            <Text style={styles.progressHint}>請耐心等候，請勿關閉頁面</Text>
          </View>
        )}

        {/* Done */}
        {status === 'done' && result && (
          <View style={styles.doneCard}>
            <Text style={styles.doneIcon}>✅</Text>
            <Text style={styles.doneTitle}>
              {mode === 'init' ? '3D 模型建立完成！' : '菌斑分析完成！'}
            </Text>
            {mode === 'init' && result.tooth_analysis && (
              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{result.tooth_analysis.total_detected ?? '—'}</Text>
                  <Text style={styles.statLabel}>偵測到牙齒</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{(result.tooth_analysis.never_detected || []).length}</Text>
                  <Text style={styles.statLabel}>未偵測到</Text>
                </View>
              </View>
            )}
            {mode === 'plaque' && result.stats && (
              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statVal, { color: Colors.redPlaque }]}>
                    {result.stats.plaque_ratio != null
                      ? `${(result.stats.plaque_ratio * 100).toFixed(1)}%`
                      : '—'}
                  </Text>
                  <Text style={styles.statLabel}>菌斑覆蓋率</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>
                    {Object.keys(result.stats.fdi_plaque_summary || {}).length}
                  </Text>
                  <Text style={styles.statLabel}>有菌斑牙齒</Text>
                </View>
              </View>
            )}
            <Pressable style={styles.resetBtn} onPress={reset}>
              <Text style={styles.resetBtnText}>再次掃描</Text>
            </Pressable>
          </View>
        )}

        {/* Failed */}
        {status === 'failed' && (
          <View style={styles.errorCard}>
            <Text style={styles.errorIcon}>❌</Text>
            <Text style={styles.errorTitle}>處理失敗</Text>
            <Text style={styles.errorMsg}>{errorMsg}</Text>
            <Pressable style={styles.resetBtn} onPress={reset}>
              <Text style={styles.resetBtnText}>重新開始</Text>
            </Pressable>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: 20, paddingBottom: 40 },

  pageTitle: {
    fontFamily: FontFamilies.display,
    fontSize: 32,
    color: Colors.ink,
    marginBottom: 16,
  },

  toggleWrap: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.jadeAlpha12,
    marginBottom: 16,
    ...Shadows.sm,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.xl,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: Colors.jade,
  },
  toggleText: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 14,
    color: Colors.muted,
  },
  toggleTextActive: { color: Colors.white },

  descCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.jadeAlpha08,
  },
  descEyebrow: {
    fontFamily: FontFamilies.body,
    fontSize: 11,
    color: Colors.muted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  descTitle: {
    fontFamily: FontFamilies.display,
    fontSize: 20,
    color: Colors.ink,
    marginBottom: 8,
  },
  descBody: {
    fontFamily: FontFamilies.body,
    fontSize: 13,
    color: Colors.muted,
    lineHeight: 20,
  },
  warnText: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 13,
    color: Colors.redPlaque,
    marginTop: 8,
  },

  uploadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  uploadCard: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.jadeAlpha12,
    borderStyle: 'dashed',
    ...Shadows.sm,
  },
  uploadPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  uploadPlaceholderIcon: { fontSize: 28 },
  uploadLabel: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 13,
    color: Colors.inkSoft,
  },
  uploadHint: {
    fontFamily: FontFamilies.body,
    fontSize: 11,
    color: Colors.muted,
  },
  preview: { width: '100%', height: '100%' },
  previewOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(26,36,32,0.7)',
    padding: 8,
  },
  previewLabel: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 12,
    color: Colors.white,
  },
  previewChange: {
    fontFamily: FontFamilies.body,
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  checkMark: {
    position: 'absolute',
    top: 8, right: 8,
    width: 22, height: 22,
    borderRadius: 11,
    backgroundColor: Colors.jade,
    alignItems: 'center',
    justifyContent: 'center',
  },

  submitBtn: {
    borderRadius: Radius.xl,
    marginBottom: 8,
    ...Shadows.md,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnInner: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  submitBtnText: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 17,
    color: Colors.white,
  },
  submitBtnSub: {
    fontFamily: FontFamilies.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },

  progressCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 40,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.jadeAlpha12,
    ...Shadows.md,
  },
  progressTitle: {
    fontFamily: FontFamilies.display,
    fontSize: 22,
    color: Colors.ink,
  },
  progressStep: {
    fontFamily: FontFamilies.body,
    fontSize: 14,
    color: Colors.jade,
  },
  progressHint: {
    fontFamily: FontFamilies.body,
    fontSize: 12,
    color: Colors.muted,
  },

  doneCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.jadeAlpha12,
    ...Shadows.md,
  },
  doneIcon: { fontSize: 48 },
  doneTitle: {
    fontFamily: FontFamilies.display,
    fontSize: 22,
    color: Colors.ink,
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 8,
  },
  statItem: { alignItems: 'center' },
  statVal: {
    fontFamily: FontFamilies.display,
    fontSize: 32,
    color: Colors.jade,
  },
  statLabel: {
    fontFamily: FontFamilies.body,
    fontSize: 12,
    color: Colors.muted,
  },

  errorCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(192,57,43,0.2)',
  },
  errorIcon: { fontSize: 48 },
  errorTitle: {
    fontFamily: FontFamilies.display,
    fontSize: 20,
    color: Colors.redPlaque,
  },
  errorMsg: {
    fontFamily: FontFamilies.body,
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
  },

  resetBtn: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: Colors.jade,
  },
  resetBtnText: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 14,
    color: Colors.jade,
  },
});
