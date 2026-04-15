import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Image,
  Alert, ActivityIndicator, Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Radius, Shadows, FontFamilies, Gradients } from '../../constants/theme';
import { submitInit, submitPlaque, fetchTaskStatus, fetchModelStatus, getFileUrl, API_BASE } from '../../services/api';

// ===== Step Definitions (matching web's progress.js) =====
const INIT_STEPS  = [
  { key: 'preprocessing', label: '照片預處理',   progress: 20 },
  { key: 'analyzing',     label: '牙齒辨識分析', progress: 50 },
  { key: 'creating_3d',   label: '建立 3D 模型', progress: 80 },
];
const PLAQUE_STEPS = [
  { key: 'detecting_plaque',   label: '菌斑偵測',      progress: 25 },
  { key: 'extracting_regions', label: '提取菌斑區域',  progress: 60 },
  { key: 'projecting_plaque',  label: '投射至 3D 模型', progress: 88 },
];

const VIEWS = ['front', 'left_side', 'right_side', 'upper_occlusal', 'lower_occlusal'] as const;
type ViewKey = typeof VIEWS[number];
type Mode = 'init' | 'plaque';
type FileMap = Partial<Record<ViewKey, { uri: string; name: string; type: string }>>;

const VIEW_LABELS: Record<ViewKey, string> = {
  front:          '正面',
  left_side:      '左側面',
  right_side:     '右側面',
  upper_occlusal: '上顎咬合面',
  lower_occlusal: '下顎咬合面',
};

// FDI upper/lower arch layout
const FDI_UPPER = [18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28];
const FDI_LOWER = [48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38];

function gradeColor(g: string) {
  return g === 'A' ? Colors.jade : g === 'B' ? Colors.jadeLight : g === 'C' ? '#e8a020' : Colors.redPlaque;
}

function calcAccuracy(t: any) {
  if (!t?.teeth) return null;
  const total = Object.keys(t.teeth).length;
  if (!total) return null;
  const detected = (t.detected_teeth || []).length;
  const never    = (t.never_detected  || []).length;
  const coverage = detected / (detected + never || 1);
  const avgConf  = Object.values(t.teeth).reduce((a: number, b: any) => a + (b.confidence || 0), 0) / total;
  const multi    = Object.values(t.teeth).filter((x: any) => x.num_views >= 2).length / total;
  const score    = coverage * 0.35 + avgConf * 0.40 + multi * 0.25;
  return { score, grade: score >= 0.85 ? 'A' : score >= 0.70 ? 'B' : score >= 0.55 ? 'C' : 'D' };
}

// ===== Step Progress Component =====
function StepProgress({ step, mode }: { step: string; mode: Mode }) {
  const steps    = mode === 'init' ? INIT_STEPS : PLAQUE_STEPS;
  const stepIdx  = steps.findIndex(s => s.key === step);
  const progress = steps.find(s => s.key === step)?.progress
    ?? (step === 'done' ? 100 : 5);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.35, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={sp.wrap}>
      {steps.map((s, i) => {
        const isDone   = i < stepIdx || step === 'done';
        const isActive = s.key === step;
        return (
          <View key={s.key} style={[sp.row, isActive && sp.rowActive, isDone && sp.rowDone]}>
            {isActive ? (
              <Animated.View style={[sp.dot, sp.dotActive, { transform: [{ scale: pulseAnim }] }]} />
            ) : (
              <View style={[sp.dot, isDone && sp.dotDone]} />
            )}
            <View style={sp.info}>
              <Text style={[sp.name, isActive && sp.nameActive, isDone && sp.nameDone]}>
                {s.label}
              </Text>
              <Text style={[sp.status, isActive && sp.statusActive, isDone && sp.statusDone]}>
                {isActive ? '進行中...' : isDone ? '完成' : '等待中'}
              </Text>
            </View>
            {isDone && <Feather name="check" size={14} color={Colors.jadeLight} />}
          </View>
        );
      })}
      {/* Progress bar */}
      <View style={sp.barWrap}>
        <LinearGradient
          colors={mode === 'init' ? Gradients.primary : Gradients.plaque}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[sp.barFill, { width: `${progress}%` }]}
        />
      </View>
      <Text style={sp.pct}>{progress}%</Text>
    </View>
  );
}

// ===== Tooth Chart (Init) =====
function ToothChart({ teeth, neverDetected }: { teeth: any; neverDetected: number[] }) {
  const renderRow = (fdi: number[]) => (
    <View style={tc.row}>
      {fdi.map(n => {
        const missing = neverDetected.includes(n);
        const present = !!teeth?.[n];
        return (
          <View
            key={n}
            style={[tc.chip, missing ? tc.chipMissing : present ? tc.chipPresent : tc.chipEmpty]}
          >
            <Text style={[tc.num, missing ? tc.numMissing : tc.numPresent]}>
              {n}
            </Text>
          </View>
        );
      })}
    </View>
  );
  return (
    <View style={tc.wrap}>
      <Text style={tc.label}>上顎</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>{renderRow(FDI_UPPER)}</ScrollView>
      <View style={tc.divider} />
      <Text style={tc.label}>下顎</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>{renderRow(FDI_LOWER)}</ScrollView>
      <View style={tc.legend}>
        <View style={tc.legendItem}><View style={[tc.legendDot, { backgroundColor: Colors.jadeAlpha20 }]} /><Text style={tc.legendText}>偵測到</Text></View>
        <View style={tc.legendItem}><View style={[tc.legendDot, { backgroundColor: 'rgba(192,57,43,0.15)' }]} /><Text style={tc.legendText}>未偵測</Text></View>
      </View>
    </View>
  );
}

// ===== Plaque Chart =====
function PlaqueChart({ summary }: { summary: Record<string, number> }) {
  const renderRow = (fdi: number[]) => (
    <View style={tc.row}>
      {fdi.map(n => {
        const ratio = summary?.[n] ?? null;
        const fillH = ratio != null ? Math.max(20, ratio * 100) : 0;
        return (
          <View key={n} style={[tc.chip, tc.chipEmpty, { overflow: 'hidden', position: 'relative' }]}>
            {ratio != null && (
              <View style={[pc.fill, { height: `${fillH}%` }]} />
            )}
            <Text style={[tc.num, { color: ratio != null ? Colors.ink : Colors.linenDark }]}>{n}</Text>
          </View>
        );
      })}
    </View>
  );
  return (
    <View style={tc.wrap}>
      <Text style={tc.label}>上顎</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>{renderRow(FDI_UPPER)}</ScrollView>
      <View style={tc.divider} />
      <Text style={tc.label}>下顎</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>{renderRow(FDI_LOWER)}</ScrollView>
      <View style={tc.legend}>
        <View style={tc.legendItem}><View style={[tc.legendDot, { backgroundColor: 'rgba(192,57,43,0.3)' }]} /><Text style={tc.legendText}>菌斑面積 (越深越多)</Text></View>
      </View>
    </View>
  );
}

// ===== Main Screen =====
export default function ScanScreen() {
  const [mode, setMode]         = useState<Mode>('init');
  const [files, setFiles]       = useState<FileMap>({});
  const [modelReady, setModelReady] = useState(false);
  const [status, setStatus]     = useState<'idle' | 'uploading' | 'processing' | 'done' | 'failed'>('idle');
  const [step, setStep]         = useState('');
  const [result, setResult]     = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [modelUrl, setModelUrl] = useState('');
  const [existingModelUrl, setExistingModelUrl] = useState('');

  useEffect(() => {
    fetchModelStatus().then(async d => {
      setModelReady(d.model_ready);
      if (d.model_ready) {
        const url = await getFileUrl('custom_real_teeth.glb');
        setExistingModelUrl(url);
      }
    }).catch(() => {});
  }, []);

  const checkQuality = (asset: ImagePicker.ImagePickerAsset) => {
    const { width, height, fileSize } = asset;
    const warnings: string[] = [];
    if (width < 800 || height < 800)
      warnings.push(`解析度偏低 (${width}×${height})，建議 ≥ 800px`);
    if (fileSize && fileSize < 100_000)
      warnings.push('檔案過小，可能已過度壓縮，影響分析準確度');
    if (warnings.length)
      Alert.alert('畫質提醒', warnings.join('\n'), [{ text: '了解，繼續使用' }, { text: '重新拍攝', style: 'cancel' }]);
  };

  const pickImage = async (view: ViewKey) => {
    Alert.alert('選擇照片', undefined, [
      {
        text: '拍照',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) { Alert.alert('請允許相機權限'); return; }
          const res = await ImagePicker.launchCameraAsync({ quality: 0.92, exif: false });
          if (!res.canceled && res.assets[0]) {
            checkQuality(res.assets[0]);
            setFiles(prev => ({ ...prev, [view]: { uri: res.assets[0].uri, name: `${view}.jpg`, type: 'image/jpeg' } }));
          }
        },
      },
      {
        text: '從相簿選取',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) { Alert.alert('請允許相片權限'); return; }
          const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.92, exif: false });
          if (!res.canceled && res.assets[0]) {
            checkQuality(res.assets[0]);
            setFiles(prev => ({ ...prev, [view]: { uri: res.assets[0].uri, name: `${view}.jpg`, type: 'image/jpeg' } }));
          }
        },
      },
      { text: '取消', style: 'cancel' },
    ]);
  };

  const allFilled   = VIEWS.every(v => files[v]);
  const filledCount = VIEWS.filter(v => files[v]).length;
  const isInit      = mode === 'init';

  const startAnalysis = async () => {
    if (!allFilled) return;
    setStatus('uploading');
    setErrorMsg('');
    try {
      const fn   = isInit ? submitInit : submitPlaque;
      const data = await fn(files as Record<ViewKey, any>);
      if (!data.task_id) throw new Error('伺服器未回傳 task_id');
      setStatus('processing');
      const timer = setInterval(async () => {
        try {
          const t = await fetchTaskStatus(data.task_id);
          setStep(t.step || '');
          if (t.status === 'done') {
            clearInterval(timer);
            const glbFile = isInit ? 'custom_real_teeth.glb' : 'plaque_by_fdi.glb';
            const url     = await getFileUrl(glbFile);
            setModelUrl(url);
            setStatus('done');
            setResult(t.result);
            if (isInit) setModelReady(true);
          } else if (t.status === 'failed') {
            clearInterval(timer);
            setStatus('failed');
            setErrorMsg(t.error || '處理失敗');
          }
        } catch {}
      }, 3000);
    } catch (e: any) {
      setStatus('failed');
      setErrorMsg(e.message || '上傳失敗');
    }
  };

  const reset = () => {
    setFiles({});
    setStatus('idle');
    setStep('');
    setResult(null);
    setErrorMsg('');
    setModelUrl('');
  };

  const open3DViewer = () => {
    router.push({
      pathname: '/viewer',
      params: {
        url:   modelUrl,
        title: isInit ? '個人化 3D 模型' : '菌斑分布 3D 模型',
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.pageTitle}>掃描</Text>
        <Text style={styles.pageSubtitle}>上傳五個角度的牙齒照片進行分析</Text>

        {/* Mode Toggle */}
        <View style={styles.toggleWrap}>
          {(['init', 'plaque'] as Mode[]).map(m => (
            m === mode ? (
              <LinearGradient
                key={m}
                colors={m === 'init' ? Gradients.primary : Gradients.plaque}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.toggleBtnGrad}
              >
                <Feather name={m === 'init' ? 'cpu' : 'search'} size={14} color={Colors.white} />
                <Text style={styles.toggleTextActive}>{m === 'init' ? '初始化模型' : '菌斑分析'}</Text>
              </LinearGradient>
            ) : (
              <Pressable key={m} style={styles.toggleBtn} onPress={() => { setMode(m); reset(); }}>
                <Feather name={m === 'init' ? 'cpu' : 'search'} size={14} color={Colors.muted} />
                <Text style={styles.toggleText}>{m === 'init' ? '初始化模型' : '菌斑分析'}</Text>
              </Pressable>
            )
          ))}
        </View>

        {/* Description Card */}
        <View style={[styles.descCard, isInit ? styles.descCardInit : styles.descCardPlaque]}>
          <View style={[styles.descAccent, { backgroundColor: isInit ? Colors.jade : Colors.aqua }]} />
          <Text style={styles.descEyebrow}>{isInit ? 'Step 01 · 一次性設定' : 'Step 02 · 可重複執行'}</Text>
          <Text style={styles.descTitle}>{isInit ? '建立個人化 3D 模型' : '牙菌斑分析'}</Text>
          <Text style={styles.descBody}>
            {isInit
              ? '上傳五個角度的清晰牙齒照片，系統將建立專屬的 3D 牙齒模型。完成後即可重複進行菌斑分析。'
              : '上傳塗抹染色劑後拍攝的五角度照片，系統將菌斑標示在你的個人化 3D 模型上。'}
          </Text>
          {mode === 'plaque' && !modelReady && (
            <View style={styles.warnRow}>
              <Feather name="alert-circle" size={13} color={Colors.redPlaque} />
              <Text style={styles.warnText}>請先完成初始化再進行菌斑分析</Text>
            </View>
          )}
        </View>

        {/* Existing model shortcut */}
        {status === 'idle' && existingModelUrl ? (
          <Pressable
            style={styles.existingModelBtn}
            onPress={() => router.push({ pathname: '/viewer', params: { url: existingModelUrl, title: '個人化 3D 模型' } })}
          >
            <View style={styles.existingModelLeft}>
              <Feather name="box" size={18} color={Colors.jade} />
              <View>
                <Text style={styles.existingModelTitle}>查看最新 3D 模型</Text>
                <Text style={styles.existingModelSub}>點擊進入全螢幕互動檢視</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={16} color={Colors.muted} />
          </Pressable>
        ) : null}

        {/* ===== IDLE ===== */}
        {status === 'idle' && (
          <>
            <View style={styles.progressWrap}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressText}>已選擇照片</Text>
                <Text style={[styles.progressCount, { color: isInit ? Colors.jade : Colors.aqua }]}>
                  {filledCount} / {VIEWS.length}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <LinearGradient
                  colors={isInit ? Gradients.primary : Gradients.plaque}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${(filledCount / VIEWS.length) * 100}%` }]}
                />
              </View>
            </View>

            <View style={styles.uploadGrid}>
              {VIEWS.map((view, idx) => {
                const file = files[view];
                return (
                  <Pressable key={view} style={styles.uploadCard} onPress={() => pickImage(view)}>
                    {file ? (
                      <>
                        <Image source={{ uri: file.uri }} style={styles.preview} />
                        <LinearGradient
                          colors={['transparent', 'rgba(26,36,32,0.72)']}
                          style={styles.previewOverlay}
                        >
                          <Text style={styles.previewLabel}>{VIEW_LABELS[view]}</Text>
                        </LinearGradient>
                        <View style={[styles.checkMark, { backgroundColor: isInit ? Colors.jade : Colors.aqua }]}>
                          <Feather name="check" size={11} color={Colors.white} />
                        </View>
                      </>
                    ) : (
                      <View style={styles.uploadPlaceholder}>
                        <View style={[styles.uploadIconWrap, { backgroundColor: isInit ? Colors.jadeAlpha08 : 'rgba(35,157,202,0.08)' }]}>
                          <Feather name="camera" size={20} color={isInit ? Colors.jade : Colors.aqua} />
                        </View>
                        <Text style={styles.uploadNum}>{idx + 1}</Text>
                        <Text style={styles.uploadLabel}>{VIEW_LABELS[view]}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <LinearGradient
              colors={isInit ? Gradients.primary : Gradients.plaque}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.submitBtn, (!allFilled || (mode === 'plaque' && !modelReady)) && styles.submitBtnDisabled]}
            >
              <Pressable
                style={styles.submitBtnInner}
                onPress={startAnalysis}
                disabled={!allFilled || (mode === 'plaque' && !modelReady)}
              >
                <View style={styles.submitIconWrap}>
                  <Feather name={isInit ? 'cpu' : 'search'} size={18} color={Colors.white} />
                </View>
                <View>
                  <Text style={styles.submitBtnText}>{isInit ? '建立我的 3D 模型' : '開始菌斑分析'}</Text>
                  <Text style={styles.submitBtnSub}>{isInit ? '約需 3–8 分鐘，僅需執行一次' : '約需 2–5 分鐘'}</Text>
                </View>
              </Pressable>
            </LinearGradient>
          </>
        )}

        {/* ===== PROCESSING ===== */}
        {(status === 'uploading' || status === 'processing') && (
          <View style={styles.stateCard}>
            <View style={styles.processingHeader}>
              <View style={styles.processingRing}>
                <ActivityIndicator size="large" color={isInit ? Colors.jade : Colors.aqua} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stateTitle}>
                  {status === 'uploading' ? '上傳照片中...' : isInit ? '建立 3D 模型中' : '菌斑分析中'}
                </Text>
                <Text style={styles.stateHint}>請耐心等候，請勿關閉頁面</Text>
              </View>
            </View>

            {status === 'processing' && (
              <StepProgress step={step} mode={mode} />
            )}
          </View>
        )}

        {/* ===== DONE ===== */}
        {status === 'done' && result && (
          <View style={styles.stateCard}>
            {/* Header */}
            <View style={styles.doneHeader}>
              <View style={styles.doneIconWrap}>
                <Feather name="check-circle" size={36} color={Colors.jade} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stateTitle}>{isInit ? '3D 模型建立完成！' : '菌斑分析完成！'}</Text>
                <Text style={styles.stateHint}>{isInit ? '以下為牙齒偵測結果' : '以下為菌斑分布結果'}</Text>
              </View>
            </View>

            {/* Key Stats */}
            <View style={styles.statRow}>
              {isInit && result.tooth_analysis && (
                <>
                  <View style={styles.statItem}>
                    <Text style={styles.statVal}>{result.tooth_analysis.total_detected ?? '—'}</Text>
                    <Text style={styles.statLabel}>偵測到牙齒</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statVal}>{(result.tooth_analysis.never_detected || []).length}</Text>
                    <Text style={styles.statLabel}>未偵測到</Text>
                  </View>
                  {(() => {
                    const acc = calcAccuracy(result.tooth_analysis);
                    return acc ? (
                      <>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                          <Text style={[styles.statVal, { color: gradeColor(acc.grade), fontSize: 32 }]}>{acc.grade}</Text>
                          <Text style={styles.statLabel}>準確度</Text>
                        </View>
                      </>
                    ) : null;
                  })()}
                </>
              )}
              {!isInit && result.stats && (
                <>
                  <View style={styles.statItem}>
                    <Text style={[styles.statVal, { color: Colors.redPlaque }]}>
                      {result.stats.plaque_ratio != null ? `${(result.stats.plaque_ratio * 100).toFixed(1)}%` : '—'}
                    </Text>
                    <Text style={styles.statLabel}>菌斑覆蓋率</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statVal}>{Object.keys(result.stats.fdi_plaque_summary || {}).length}</Text>
                    <Text style={styles.statLabel}>有菌斑牙齒</Text>
                  </View>
                </>
              )}
            </View>

            {/* Tooth Chart */}
            <View style={styles.chartBlock}>
              <Text style={styles.blockTitle}>
                {isInit ? '牙位偵測分布圖' : '菌斑分布圖'}
              </Text>
              {isInit && result.tooth_analysis && (
                <ToothChart
                  teeth={result.tooth_analysis.teeth}
                  neverDetected={result.tooth_analysis.never_detected || []}
                />
              )}
              {!isInit && result.stats?.fdi_plaque_summary && (
                <PlaqueChart summary={result.stats.fdi_plaque_summary} />
              )}
            </View>

            {/* 3D Viewer Button */}
            {modelUrl ? (
              <Pressable style={styles.viewerBtn} onPress={open3DViewer}>
                <LinearGradient
                  colors={Gradients.hero}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.viewerBtnGrad}
                >
                  <Feather name="box" size={18} color={Colors.white} />
                  <Text style={styles.viewerBtnText}>全螢幕查看 3D 模型</Text>
                  <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.7)" />
                </LinearGradient>
              </Pressable>
            ) : null}

            <Pressable style={styles.resetBtn} onPress={reset}>
              <Feather name="refresh-cw" size={14} color={Colors.jade} />
              <Text style={styles.resetBtnText}>再次掃描</Text>
            </Pressable>
          </View>
        )}

        {/* ===== FAILED ===== */}
        {status === 'failed' && (
          <View style={[styles.stateCard, styles.stateCardError]}>
            <View style={styles.errorIconWrap}>
              <Feather name="x-circle" size={44} color={Colors.redPlaque} />
            </View>
            <Text style={[styles.stateTitle, { color: Colors.redPlaque }]}>處理失敗</Text>
            <Text style={styles.stateHint}>{errorMsg}</Text>
            <Pressable style={styles.resetBtn} onPress={reset}>
              <Feather name="refresh-cw" size={14} color={Colors.jade} />
              <Text style={styles.resetBtnText}>重新開始</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ========== Styles ==========
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: 20, paddingBottom: 52 },


  toggleWrap: {
    flexDirection: 'row', backgroundColor: Colors.white,
    borderRadius: Radius.xl, padding: 4,
    borderWidth: 1, borderColor: Colors.jadeAlpha12,
    marginBottom: 16, gap: 4, ...Shadows.sm,
  },
  toggleBtnGrad: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: Radius.xl,
  },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: Radius.xl,
  },
  toggleText:       { fontFamily: FontFamilies.bodyMed, fontSize: 13, color: Colors.muted },
  toggleTextActive: { fontFamily: FontFamilies.bodyMed, fontSize: 13, color: Colors.white },

  descCard: {
    backgroundColor: Colors.white, borderRadius: Radius.md,
    padding: 18, paddingLeft: 22, marginBottom: 20,
    borderWidth: 1, overflow: 'hidden', ...Shadows.sm,
  },
  descCardInit:   { borderColor: Colors.jadeAlpha12 },
  descCardPlaque: { borderColor: 'rgba(35,157,202,0.12)' },
  descAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  descEyebrow: { fontFamily: FontFamilies.body, fontSize: 11, color: Colors.muted, letterSpacing: 0.4, marginBottom: 5 },
  descTitle:   { fontFamily: FontFamilies.display, fontSize: 20, color: Colors.ink, marginBottom: 8 },
  descBody:    { fontFamily: FontFamilies.body, fontSize: 13, color: Colors.muted, lineHeight: 20 },
  warnRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
    padding: 10, backgroundColor: 'rgba(192,57,43,0.06)', borderRadius: Radius.sm,
  },
  warnText: { fontFamily: FontFamilies.bodyMed, fontSize: 12, color: Colors.redPlaque },

  progressWrap: { marginBottom: 14 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressText:  { fontFamily: FontFamilies.body, fontSize: 13, color: Colors.muted },
  progressCount: { fontFamily: FontFamilies.bodyMed, fontSize: 13 },
  progressBar:  { height: 5, backgroundColor: Colors.jadeAlpha08, borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },

  uploadGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  uploadCard: {
    width: '47%', aspectRatio: 1, borderRadius: Radius.md,
    overflow: 'hidden', backgroundColor: Colors.white,
    borderWidth: 1.5, borderColor: Colors.jadeAlpha12,
    borderStyle: 'dashed', ...Shadows.sm,
  },
  uploadPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5, padding: 12 },
  uploadIconWrap:    { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  uploadNum:  { position: 'absolute', top: 10, left: 12, fontFamily: FontFamilies.bodyMed, fontSize: 11, color: Colors.linenDark },
  uploadLabel: { fontFamily: FontFamilies.bodyMed, fontSize: 13, color: Colors.inkSoft, textAlign: 'center' },
  preview: { width: '100%', height: '100%' },
  previewOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 20, paddingBottom: 9, paddingHorizontal: 10 },
  previewLabel: { fontFamily: FontFamilies.bodyMed, fontSize: 12, color: Colors.white },
  checkMark: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

  submitBtn: { borderRadius: Radius.xl, marginBottom: 8, ...Shadows.hero },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingVertical: 18, paddingHorizontal: 24 },
  submitIconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { fontFamily: FontFamilies.bodyMed, fontSize: 16, color: Colors.white },
  submitBtnSub:  { fontFamily: FontFamilies.body, fontSize: 11, color: 'rgba(255,255,255,0.70)', marginTop: 2 },

  stateCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: 24, borderWidth: 1, borderColor: Colors.jadeAlpha12, ...Shadows.md,
  },
  stateCardError: { borderColor: 'rgba(192,57,43,0.15)' },

  // Processing
  processingHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  processingRing: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.jadeAlpha08, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stateTitle: { fontFamily: FontFamilies.display, fontSize: 20, color: Colors.ink, marginBottom: 4 },
  stateHint:  { fontFamily: FontFamilies.body, fontSize: 13, color: Colors.muted },

  // Done
  doneHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  doneIconWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.jadeAlpha08, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  errorIconWrap: {
    width: 80, height: 80, borderRadius: 40, alignSelf: 'center',
    backgroundColor: 'rgba(192,57,43,0.07)', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },

  statRow: {
    flexDirection: 'row', alignItems: 'center', gap: 20,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    paddingVertical: 16, paddingHorizontal: 20, marginBottom: 20, justifyContent: 'center',
  },
  statItem: { alignItems: 'center' },
  statVal:  { fontFamily: FontFamilies.display, fontSize: 30, color: Colors.jade, lineHeight: 34 },
  statLabel: { fontFamily: FontFamilies.body, fontSize: 12, color: Colors.muted, marginTop: 2 },
  statDivider: { width: 1, height: 34, backgroundColor: Colors.jadeAlpha12 },

  chartBlock: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: 16, marginBottom: 16,
  },
  blockTitle: {
    fontFamily: FontFamilies.bodyMed, fontSize: 11, color: Colors.muted,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12,
  },

  viewerBtn: { borderRadius: Radius.xl, overflow: 'hidden', marginBottom: 12, ...Shadows.hero },
  viewerBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16,
  },
  viewerBtnText: { fontFamily: FontFamilies.bodyMed, fontSize: 15, color: Colors.white, flex: 1, textAlign: 'center' },

  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 13, paddingHorizontal: 26, borderRadius: Radius.xl,
    borderWidth: 1.5, borderColor: Colors.jade, marginTop: 4,
  },
  resetBtnText: { fontFamily: FontFamilies.bodyMed, fontSize: 14, color: Colors.jade },

  existingModelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, borderRadius: Radius.md,
    padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.jadeAlpha12, ...Shadows.sm,
  },
  existingModelLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  existingModelTitle: { fontFamily: FontFamilies.bodyMed, fontSize: 14, color: Colors.ink, fontWeight: '600' },
  existingModelSub:   { fontFamily: FontFamilies.body, fontSize: 12, color: Colors.muted, marginTop: 2 },

  pageTitle:    { fontFamily: FontFamilies.heading, fontSize: 32, color: Colors.ink, marginBottom: 4 },
  pageSubtitle: { fontFamily: FontFamilies.body, fontSize: 14, color: Colors.muted, marginBottom: 20 },
});

// ===== Step Progress Styles =====
const sp = StyleSheet.create({
  wrap: { gap: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: Radius.sm,
  },
  rowActive: { backgroundColor: 'rgba(35,157,202,0.06)' },
  rowDone:   { backgroundColor: 'rgba(109,175,95,0.07)' },
  dot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.linenDark, flexShrink: 0,
  },
  dotActive: { backgroundColor: Colors.aqua },
  dotDone:   { backgroundColor: Colors.jadeLight },
  info: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontFamily: FontFamilies.bodyMed, fontSize: 14, color: Colors.inkSoft },
  nameActive: { color: Colors.ink },
  nameDone:   { color: Colors.inkSoft },
  status: { fontFamily: FontFamilies.body, fontSize: 12, color: Colors.muted },
  statusActive: { color: Colors.aqua },
  statusDone:   { color: Colors.jadeLight },
  barWrap: { height: 5, backgroundColor: Colors.jadeAlpha08, borderRadius: 99, overflow: 'hidden', marginTop: 8 },
  barFill: { height: '100%', borderRadius: 99 },
  pct: { fontFamily: FontFamilies.body, fontSize: 11, color: Colors.muted, textAlign: 'right', marginTop: 4 },
});

// ===== Tooth Chart Styles =====
const tc = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontFamily: FontFamilies.bodyMed, fontSize: 11, color: Colors.muted, letterSpacing: 0.3 },
  row:   { flexDirection: 'row', gap: 4 },
  chip:  {
    width: 30, height: 30, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  chipPresent: { backgroundColor: Colors.jadeAlpha12 },
  chipMissing: { backgroundColor: 'rgba(192,57,43,0.10)', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(192,57,43,0.25)' },
  chipEmpty:   { backgroundColor: Colors.jadeAlpha04 },
  num: { fontFamily: FontFamilies.bodyMed, fontSize: 9 },
  numPresent: { color: Colors.jade },
  numMissing: { color: Colors.redPlaque },
  divider: { height: 1, backgroundColor: Colors.jadeAlpha08, marginVertical: 4 },
  legend: { flexDirection: 'row', gap: 16, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontFamily: FontFamilies.body, fontSize: 11, color: Colors.muted },
});

const pc = StyleSheet.create({
  fill: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(192,57,43,0.55)',
  },
});
