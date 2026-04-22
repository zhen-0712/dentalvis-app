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
import { submitInit, submitPlaque, fetchTaskStatus, fetchModelStatus, getFileUrl, checkPhotoQuality } from '../../services/api';

// ===== Step Definitions =====
const INIT_STEPS  = [
  { key: 'preprocessing', label: '照片預處理',   progress: 20 },
  { key: 'analyzing',     label: '牙齒辨識分析', progress: 55 },
  { key: 'creating_3d',   label: '建立 3D 模型', progress: 85 },
];
const PLAQUE_STEPS = [
  { key: 'detecting_plaque',   label: '菌斑偵測',       progress: 25 },
  { key: 'extracting_regions', label: '提取菌斑區域',   progress: 60 },
  { key: 'projecting_plaque',  label: '投射至 3D 模型', progress: 88 },
];

const VIEWS = ['front', 'left_side', 'right_side', 'upper_occlusal', 'lower_occlusal'] as const;
type ViewKey = typeof VIEWS[number];
type Mode = 'init' | 'plaque';
type FileMap = Partial<Record<ViewKey, { uri: string; name: string; type: string }>>;
type QualityState = 'checking' | 'ok' | 'warn';
type QualityMap  = Partial<Record<ViewKey, { state: QualityState; issue?: string; tip?: string }>>;

const VIEW_LABELS: Record<ViewKey, string> = {
  front:          '正面',
  left_side:      '左側面',
  right_side:     '右側面',
  upper_occlusal: '上顎咬合面',
  lower_occlusal: '下顎咬合面',
};

const FDI_UPPER = [18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28];
const FDI_LOWER = [48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38];

const VIEW_FILE_LABELS: Record<string, string> = {
  'front.jpg':          '正面',
  'left_side.jpg':      '左側',
  'right_side.jpg':     '右側',
  'upper_occlusal.jpg': '上顎咬合',
  'lower_occlusal.jpg': '下顎咬合',
};

function gradeColor(g: string) {
  return g === 'A' ? Colors.jade : g === 'B' ? Colors.jadeLight : g === 'C' ? '#e8a020' : Colors.redPlaque;
}

// ===== Accuracy Calculations (matching web result.js) =====
function calcInitAccuracy(t: any) {
  if (!t?.teeth) return null;
  const teeth = t.teeth;
  const total = Object.keys(teeth).length;
  if (!total) return null;

  const detected = (t.detected_teeth || []).length;
  const never    = (t.never_detected || []).length;
  const detectionCoverage = detected / (detected + never || 1);
  const avgConfidence = (Object.values(teeth) as any[]).reduce((a: number, b: any) => a + (b.confidence || 0), 0) / total;
  const multiViewRate = (Object.values(teeth) as any[]).filter((x: any) => x.num_views >= 2).length / total;
  const overallScore  = detectionCoverage * 0.35 + avgConfidence * 0.40 + multiViewRate * 0.25;
  const grade = overallScore >= 0.85 ? 'A' : overallScore >= 0.70 ? 'B' : overallScore >= 0.55 ? 'C' : 'D';

  const byView = t.by_view || {};
  const viewBars = Object.entries(VIEW_FILE_LABELS).map(([file, label]) => ({
    label, value: Math.min((byView[file]?.length || 0) / 16, 1), sub: true,
  }));

  return {
    grade, overallScore,
    bars: [
      { label: '偵測覆蓋',   value: detectionCoverage, sub: false },
      { label: '平均可信度', value: avgConfidence,      sub: false },
      { label: '多視角驗證', value: multiViewRate,      sub: false },
      ...viewBars,
    ],
  };
}

function calcPlaqueAccuracy(stats: any, toothData: any) {
  if (!stats) return null;
  const summary = stats.fdi_plaque_summary || {};
  const total = Object.keys(summary).length;
  if (!total) return null;

  const satPlaqueTotal = stats.sat_plaque_fdi_count || total;
  const fdiWithHits    = (Object.values(summary) as any[]).filter((v: any) => (v.hit_verts || 0) > 0).length;
  const projectionHit  = fdiWithHits / satPlaqueTotal;

  const teethMap = toothData?.teeth || {};
  const multiViewFdi = Object.keys(summary).filter(fdi => {
    const info = teethMap[fdi];
    return info && (info.detected_in_views || []).length >= 2 && (summary[fdi].hit_verts || 0) > 0;
  }).length;
  const crossViewRate = multiViewFdi / total;
  const overallScore  = projectionHit * 0.60 + crossViewRate * 0.40;
  const grade = overallScore >= 0.80 ? 'A' : overallScore >= 0.60 ? 'B' : overallScore >= 0.40 ? 'C' : 'D';

  return {
    grade, overallScore,
    bars: [
      { label: '投射命中率', value: projectionHit, sub: false },
      { label: '多視角驗證', value: crossViewRate, sub: false },
    ],
  };
}

// ===== AccuracyBars component =====
function AccuracyBars({ title, grade, score, bars, bgColor }: {
  title: string; grade: string; score: number;
  bars: { label: string; value: number; sub: boolean }[];
  bgColor?: string;
}) {
  const color = gradeColor(grade);
  return (
    <View style={[ab.wrap, bgColor ? { backgroundColor: bgColor } : null]}>
      <View style={ab.header}>
        <Text style={ab.title}>{title}</Text>
        <View style={[ab.gradeBadge, { backgroundColor: color }]}>
          <Text style={ab.gradeText}>{grade}</Text>
        </View>
        <Text style={ab.scoreText}>{Math.round(score * 100)}%</Text>
      </View>
      {bars.map((b, i) => {
        const barColor = b.sub ? 'rgba(3,105,94,0.35)' : color;
        const widthPct = `${Math.round(b.value * 100)}%`;
        return (
          <View key={i} style={[ab.row, b.sub && ab.rowSub]}>
            <Text style={[ab.label, b.sub && ab.labelSub]}>{b.label}</Text>
            <View style={ab.barWrap}>
              <View style={[ab.bar, { width: widthPct as any, backgroundColor: barColor }]} />
            </View>
            <Text style={ab.pct}>{Math.round(b.value * 100)}%</Text>
          </View>
        );
      })}
      <Text style={ab.note}>
        {title.includes('菌斑')
          ? '投射命中 × 60% ＋ 多視角驗證 × 40%'
          : '偵測覆蓋 × 35% ＋ 平均可信度 × 40% ＋ 多視角驗證 × 25%'}
      </Text>
    </View>
  );
}

// ===== Step Progress =====
function StepProgress({ step, mode }: { step: string; mode: Mode }) {
  const steps   = mode === 'init' ? INIT_STEPS : PLAQUE_STEPS;
  const stepIdx = steps.findIndex(s => s.key === step);
  const progress = steps.find(s => s.key === step)?.progress ?? (step === 'done' ? 100 : 5);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.4, duration: 500, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,   duration: 500, useNativeDriver: true }),
    ]));
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
            {isActive
              ? <Animated.View style={[sp.dot, sp.dotActive, { transform: [{ scale: pulseAnim }] }]} />
              : <View style={[sp.dot, isDone && sp.dotDone]} />}
            <View style={sp.info}>
              <Text style={[sp.name, isActive && sp.nameActive, isDone && sp.nameDone]}>{s.label}</Text>
              <Text style={[sp.status, isActive && sp.statusActive, isDone && sp.statusDone]}>
                {isActive ? '進行中...' : isDone ? '完成' : '等待中'}
              </Text>
            </View>
            {isDone && <Feather name="check" size={14} color={Colors.jadeLight} />}
          </View>
        );
      })}
      <View style={sp.barWrap}>
        <LinearGradient
          colors={mode === 'init' ? Gradients.primary : Gradients.plaque}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[sp.barFill, { width: `${progress}%` as any }]}
        />
      </View>
      <Text style={sp.pct}>{progress}%</Text>
    </View>
  );
}

// ===== Tooth Chart — shows ALL 32 FDI positions =====
function ToothChart({ teeth, neverDetected, suspicious }: {
  teeth: any; neverDetected: number[]; suspicious?: number[];
}) {
  const missingSet = new Set(neverDetected.map(Number));
  const suspectSet = new Set((suspicious || []).map(Number));

  const renderRow = (fdi: number[], jaw: string) => (
    <View key={jaw}>
      <Text style={tc.jawLabel}>{jaw}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={tc.row}>
          {fdi.map(n => {
            const isMissing = missingSet.has(n);
            const isSuspect = !isMissing && suspectSet.has(n);
            const isPresent = !isMissing && !!teeth?.[n];
            return (
              <View key={n} style={[
                tc.chip,
                isMissing ? tc.chipMissing : isSuspect ? tc.chipSuspect : isPresent ? tc.chipPresent : tc.chipEmpty,
              ]}>
                <Text style={[tc.num, isMissing ? tc.numMissing : isSuspect ? tc.numSuspect : tc.numPresent]}>
                  {n}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <View style={tc.wrap}>
      {renderRow(FDI_UPPER, '上顎')}
      <View style={tc.divider} />
      {renderRow(FDI_LOWER, '下顎')}
      <View style={tc.legend}>
        <View style={tc.legendItem}><View style={[tc.legendDot, { backgroundColor: Colors.jadeAlpha20 }]} /><Text style={tc.legendText}>偵測到</Text></View>
        {(suspicious?.length ?? 0) > 0 && (
          <View style={tc.legendItem}><View style={[tc.legendDot, { backgroundColor: 'rgba(232,160,32,0.3)' }]} /><Text style={tc.legendText}>可信度低</Text></View>
        )}
        <View style={tc.legendItem}><View style={[tc.legendDot, { backgroundColor: 'rgba(192,57,43,0.15)' }]} /><Text style={tc.legendText}>缺牙</Text></View>
      </View>
    </View>
  );
}

// ===== Plaque Chart — shows ALL 32 FDI positions =====
function PlaqueChart({ summary, neverDetected }: {
  summary: Record<string, any>; neverDetected?: number[];
}) {
  const missingSet = new Set((neverDetected || []).map(Number));
  const pxValues = Object.values(summary).map((v: any) =>
    typeof v === 'object' ? (v.total_plaque_px || 0) : (v as number)
  );
  const maxPx = Math.max(...pxValues, 1);

  const getPx = (n: number) => {
    const v = summary[n] ?? summary[String(n)];
    if (!v) return 0;
    return typeof v === 'object' ? (v.total_plaque_px || 0) : (v as number);
  };

  const renderRow = (fdi: number[], jaw: string) => (
    <View key={jaw}>
      <Text style={tc.jawLabel}>{jaw}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={tc.row}>
          {fdi.map(n => {
            const isMissing = missingSet.has(n);
            const px  = isMissing ? 0 : getPx(n);
            const pct = isMissing ? 0 : Math.round((px / maxPx) * 100);
            const fillOpacity = px > 0 ? 0.28 + (pct / 100) * 0.55 : 0;
            return (
              <View key={n} style={[tc.chip, tc.chipEmpty, { overflow: 'hidden' }]}>
                {!isMissing && px > 0 && (
                  <View style={[pc.fill, {
                    height: `${Math.max(15, pct)}%` as any,
                    backgroundColor: `rgba(35,157,202,${fillOpacity.toFixed(2)})`,
                  }]} />
                )}
                {isMissing && <View style={pc.missingFill} />}
                <Text style={[tc.num, { color: isMissing ? Colors.redPlaque : px > 0 ? Colors.ink : Colors.linenDark }]}>
                  {n}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <View style={tc.wrap}>
      {renderRow(FDI_UPPER, '上顎')}
      <View style={tc.divider} />
      {renderRow(FDI_LOWER, '下顎')}
      <View style={tc.legend}>
        <View style={tc.legendItem}><View style={[tc.legendDot, { backgroundColor: 'rgba(35,157,202,0.65)' }]} /><Text style={tc.legendText}>菌斑 (越深越多)</Text></View>
        {(neverDetected?.length ?? 0) > 0 && (
          <View style={tc.legendItem}><View style={[tc.legendDot, { backgroundColor: 'rgba(192,57,43,0.15)' }]} /><Text style={tc.legendText}>缺牙</Text></View>
        )}
      </View>
    </View>
  );
}

// ===== Badge list =====
function BadgeList({ items, color }: { items: number[]; color: string }) {
  if (!items.length) return null;
  return (
    <View style={bl.wrap}>
      {items.map(n => (
        <View key={n} style={[bl.badge, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
          <Text style={[bl.text, { color }]}>{n}</Text>
        </View>
      ))}
    </View>
  );
}

// ===== Main Screen =====
export default function ScanScreen() {
  const [mode, setMode]             = useState<Mode>('init');
  const [mirror, setMirror]         = useState(false);   // true = rear camera (self-shot), needs H-flip
  const [files, setFiles]           = useState<FileMap>({});
  const [quality, setQuality]       = useState<QualityMap>({});
  const [modelReady, setModelReady] = useState(false);
  const [status, setStatus]         = useState<'idle' | 'uploading' | 'processing' | 'done' | 'failed'>('idle');
  const [step, setStep]             = useState('');
  const [result, setResult]         = useState<any>(null);
  const [errorMsg, setErrorMsg]     = useState('');
  const [modelUrl, setModelUrl]           = useState('');
  const [existingModelUrl, setExistingModelUrl]   = useState('');
  const [existingPlaqueUrl, setExistingPlaqueUrl] = useState('');

  useEffect(() => {
    fetchModelStatus().then(async d => {
      setModelReady(d.model_ready);
      if (d.model_ready) setExistingModelUrl(await getFileUrl('custom_real_teeth.glb'));
    }).catch(() => {});
    // Try to load existing plaque model URL (may 404 if never run)
    getFileUrl('plaque_by_fdi.glb').then(url =>
      fetch(url, { method: 'HEAD' }).then(r => { if (r.ok) setExistingPlaqueUrl(url); }).catch(() => {})
    ).catch(() => {});
  }, []);

  const checkQuality = (asset: ImagePicker.ImagePickerAsset) => {
    const { width, height, fileSize } = asset;
    const warnings: string[] = [];
    if (width < 800 || height < 800)
      warnings.push(`解析度偏低 (${width}×${height})，建議 ≥ 800px`);
    if (fileSize && fileSize < 100_000)
      warnings.push('檔案過小，可能過度壓縮，影響準確度');
    if (warnings.length)
      Alert.alert('畫質提醒', warnings.join('\n'), [
        { text: '了解，繼續' }, { text: '重新拍攝', style: 'cancel' },
      ]);
  };

  const runQualityCheck = async (uri: string, view: ViewKey) => {
    setQuality(prev => ({ ...prev, [view]: { state: 'checking' } }));
    try {
      const r = await checkPhotoQuality(uri, view);
      const isOk = r?.ok !== false || !r?.issues?.length;
      setQuality(prev => ({
        ...prev,
        [view]: {
          state: isOk ? 'ok' : 'warn',
          issue: r?.issues?.[0],
          tip:   r?.tips?.[0],
        },
      }));
    } catch {
      // Network error or parse failure — don't block the user
      setQuality(prev => ({ ...prev, [view]: { state: 'ok' } }));
    }
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
            setFiles(p => ({ ...p, [view]: { uri: res.assets[0].uri, name: `${view}.jpg`, type: 'image/jpeg' } }));
            runQualityCheck(res.assets[0].uri, view);
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
            setFiles(p => ({ ...p, [view]: { uri: res.assets[0].uri, name: `${view}.jpg`, type: 'image/jpeg' } }));
            runQualityCheck(res.assets[0].uri, view);
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
      const data = await fn(files as Record<ViewKey, any>, mirror);
      if (!data.task_id) throw new Error('伺服器未回傳 task_id');
      setStatus('processing');
      const timer = setInterval(async () => {
        try {
          const t = await fetchTaskStatus(data.task_id);
          setStep(t.step || '');
          if (t.status === 'done') {
            clearInterval(timer);
            const glbFile = isInit ? 'custom_real_teeth.glb' : 'plaque_by_fdi.glb';
            // Cache-bust so model-viewer always fetches the freshly generated file
            const url = (await getFileUrl(glbFile)) + `&t=${Date.now()}`;
            setModelUrl(url);
            setResult(t.result);
            setStatus('done');
            if (isInit) {
              setModelReady(true);
              setExistingModelUrl(url);
            } else {
              setExistingPlaqueUrl(url);
            }
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
    setQuality({});
    setStatus('idle');
    setStep('');
    setResult(null);
    setErrorMsg('');
    setModelUrl('');
  };

  const open3D = (url: string, title: string) =>
    router.push({ pathname: '/viewer', params: { url, title } });

  const suspiciousList: number[] = result?.tooth_analysis
    ? [
        ...(result.tooth_analysis.suspicious?.low_confidence || []),
        ...(result.tooth_analysis.suspicious?.insufficient_views || []),
      ].map(Number)
    : [];

  const initAcc   = result?.tooth_analysis ? calcInitAccuracy(result.tooth_analysis)            : null;
  const plaqueAcc = result?.stats          ? calcPlaqueAccuracy(result.stats, result.tooth_analysis) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.pageTitle}>掃描</Text>
        <Text style={styles.pageSubtitle}>上傳五個角度的牙齒照片進行分析</Text>

        {/* Mode Toggle */}
        <View style={styles.toggleWrap}>
          {(['init', 'plaque'] as Mode[]).map(m => (
            m === mode ? (
              <LinearGradient key={m} colors={m === 'init' ? Gradients.primary : Gradients.plaque}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.toggleBtnGrad}>
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

        {/* Description Card — semi-transparent */}
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
        {status === 'idle' && !!existingModelUrl && mode === 'init' && (
          <Pressable style={styles.existingModelBtn}
            onPress={() => open3D(existingModelUrl, '個人化 3D 模型')}>
            <View style={styles.existingModelLeft}>
              <LinearGradient colors={Gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.existingModelIcon}>
                <Feather name="box" size={16} color={Colors.white} />
              </LinearGradient>
              <View>
                <Text style={styles.existingModelTitle}>查看最新 3D 模型</Text>
                <Text style={styles.existingModelSub}>點擊進入全螢幕互動檢視</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={16} color={Colors.muted} />
          </Pressable>
        )}
        {status === 'idle' && !!existingPlaqueUrl && mode === 'plaque' && (
          <Pressable style={[styles.existingModelBtn, styles.existingModelBtnPlaque]}
            onPress={() => open3D(existingPlaqueUrl, '菌斑分布 3D 模型')}>
            <View style={styles.existingModelLeft}>
              <LinearGradient colors={Gradients.plaque} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.existingModelIcon}>
                <Feather name="box" size={16} color={Colors.white} />
              </LinearGradient>
              <View>
                <Text style={styles.existingModelTitle}>查看上次菌斑 3D 模型</Text>
                <Text style={styles.existingModelSub}>點擊進入全螢幕互動檢視</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={16} color={Colors.muted} />
          </Pressable>
        )}

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
                <LinearGradient colors={isInit ? Gradients.primary : Gradients.plaque}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${(filledCount / VIEWS.length) * 100}%` as any }]} />
              </View>
            </View>

            {/* Camera mode toggle */}
            <Pressable style={styles.mirrorRow} onPress={() => setMirror(m => !m)}>
              <View style={[styles.mirrorToggle, mirror && styles.mirrorToggleOn]}>
                <View style={[styles.mirrorThumb, mirror && styles.mirrorThumbOn]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mirrorLabel}>
                  {mirror ? '後置相機（自行拍攝）' : '前置相機（自拍）'}
                </Text>
                <Text style={styles.mirrorHint}>
                  {mirror ? '照片將自動水平翻轉以修正左右方向' : '前置相機，左右方向已正確'}
                </Text>
              </View>
              <Feather name={mirror ? 'camera' : 'camera'} size={16}
                color={mirror ? Colors.aqua : Colors.muted} />
            </Pressable>

            <View style={styles.uploadGrid}>
              {VIEWS.map((view, idx) => {
                const file = files[view];
                return (
                  <Pressable key={view} style={styles.uploadCard} onPress={() => pickImage(view)}>
                    {file ? (
                      <>
                        <Image source={{ uri: file.uri }} style={styles.preview} />
                        <LinearGradient colors={['transparent', 'rgba(26,36,32,0.72)']}
                          style={styles.previewOverlay}>
                          <Text style={styles.previewLabel}>{VIEW_LABELS[view]}</Text>
                        </LinearGradient>
                        <View style={[styles.checkMark, { backgroundColor: isInit ? Colors.jade : Colors.aqua }]}>
                          <Feather name="check" size={11} color={Colors.white} />
                        </View>
                        {/* Quality badge */}
                        {quality[view]?.state === 'checking' && (
                          <View style={[styles.qualityBadge, styles.qualityChecking]}>
                            <ActivityIndicator size={9} color={Colors.white} />
                            <Text style={styles.qualityBadgeTxt}>檢查中</Text>
                          </View>
                        )}
                        {quality[view]?.state === 'ok' && (
                          <View style={[styles.qualityBadge, styles.qualityOk]}>
                            <Feather name="check-circle" size={9} color={Colors.white} />
                            <Text style={styles.qualityBadgeTxt}>品質良好</Text>
                          </View>
                        )}
                        {quality[view]?.state === 'warn' && (
                          <View style={[styles.qualityBadge, styles.qualityWarn]}>
                            <Feather name="alert-circle" size={9} color={Colors.white} />
                            <Text style={styles.qualityBadgeTxt} numberOfLines={1}>
                              {quality[view]?.issue ?? '品質提醒'}
                            </Text>
                          </View>
                        )}
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

            {/* Quality tips summary */}
            {VIEWS.some(v => quality[v]?.state === 'warn') && (
              <View style={styles.qualityTipBox}>
                {VIEWS.filter(v => quality[v]?.state === 'warn').map(v => (
                  <View key={v} style={styles.qualityTipRow}>
                    <Feather name="alert-circle" size={12} color="#e8a020" />
                    <Text style={styles.qualityTipTxt}>
                      <Text style={styles.qualityTipView}>{VIEW_LABELS[v]}：</Text>
                      {quality[v]?.tip ?? quality[v]?.issue}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <LinearGradient colors={isInit ? Gradients.primary : Gradients.plaque}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.submitBtn, (!allFilled || (mode === 'plaque' && !modelReady)) && styles.submitBtnDisabled]}>
              <Pressable style={styles.submitBtnInner} onPress={startAnalysis}
                disabled={!allFilled || (mode === 'plaque' && !modelReady)}>
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
            {status === 'processing' && <StepProgress step={step} mode={mode} />}
          </View>
        )}

        {/* ===== DONE ===== */}
        {status === 'done' && result && (
          <View style={styles.stateCard}>

            <View style={styles.doneHeader}>
              <LinearGradient
                colors={isInit ? Gradients.primary : Gradients.plaque}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.doneIconWrap}>
                <Feather name="check" size={26} color={Colors.white} />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.stateTitle}>{isInit ? '3D 模型建立完成！' : '菌斑分析完成！'}</Text>
                <Text style={styles.stateHint}>{isInit ? '以下為牙齒偵測結果' : '以下為菌斑分布結果'}</Text>
              </View>
            </View>

            {/* Key Stats */}
            <View style={[styles.statRow, !isInit && styles.statRowPlaque]}>
              {isInit && result.tooth_analysis && (() => {
                const t = result.tooth_analysis;
                return (
                  <>
                    <View style={styles.statItem}>
                      <Text style={styles.statVal}>{t.total_detected ?? '—'}</Text>
                      <Text style={styles.statLabel}>偵測牙齒</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statVal}>{(t.never_detected || []).length}</Text>
                      <Text style={styles.statLabel}>未偵測到</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statVal}>{t.reliable_count ?? '—'}</Text>
                      <Text style={styles.statLabel}>高可信度</Text>
                    </View>
                    {initAcc && (
                      <>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                          <Text style={[styles.statVal, { color: gradeColor(initAcc.grade), fontSize: 32 }]}>
                            {initAcc.grade}
                          </Text>
                          <Text style={styles.statLabel}>準確度</Text>
                        </View>
                      </>
                    )}
                  </>
                );
              })()}
              {!isInit && result.stats && (
                <>
                  <View style={styles.statItem}>
                    <Text style={[styles.statVal, { color: Colors.redPlaque }]}>
                      {result.stats.plaque_ratio != null
                        ? `${(result.stats.plaque_ratio * 100).toFixed(1)}%` : '—'}
                    </Text>
                    <Text style={styles.statLabel}>菌斑覆蓋率</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statVal}>{Object.keys(result.stats.fdi_plaque_summary || {}).length}</Text>
                    <Text style={styles.statLabel}>有菌斑牙齒</Text>
                  </View>
                  {plaqueAcc && (
                    <>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={[styles.statVal, { color: gradeColor(plaqueAcc.grade), fontSize: 32 }]}>
                          {plaqueAcc.grade}
                        </Text>
                        <Text style={styles.statLabel}>準確度</Text>
                      </View>
                    </>
                  )}
                </>
              )}
            </View>

            {/* 3D Viewer Button */}
            {!!modelUrl && (
              <Pressable style={styles.viewerBtn}
                onPress={() => open3D(modelUrl, isInit ? '個人化 3D 模型' : '菌斑分布 3D 模型')}>
                <LinearGradient
                  colors={isInit ? Gradients.hero : Gradients.plaque}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.viewerBtnGrad}>
                  <Feather name="box" size={18} color={Colors.white} />
                  <Text style={styles.viewerBtnText}>全螢幕查看 3D 模型</Text>
                  <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.7)" />
                </LinearGradient>
              </Pressable>
            )}

            {/* Tooth / Plaque Chart */}
            <View style={[styles.chartBlock, !isInit && styles.chartBlockPlaque]}>
              <Text style={styles.blockLabel}>{isInit ? '牙位偵測分布圖' : '菌斑分布圖'}</Text>
              {isInit && result.tooth_analysis && (
                <ToothChart
                  teeth={result.tooth_analysis.teeth}
                  neverDetected={result.tooth_analysis.never_detected || []}
                  suspicious={suspiciousList}
                />
              )}
              {!isInit && result.stats?.fdi_plaque_summary && (
                <PlaqueChart
                  summary={result.stats.fdi_plaque_summary}
                  neverDetected={result.tooth_analysis?.never_detected}
                />
              )}
            </View>

            {/* Missing teeth badges */}
            {isInit && (result.tooth_analysis?.never_detected || []).length > 0 && (
              <View style={styles.badgeBlock}>
                <Text style={styles.badgeBlockTitle}>未偵測到的牙齒</Text>
                <BadgeList items={result.tooth_analysis.never_detected} color={Colors.redPlaque} />
              </View>
            )}

            {/* Suspicious teeth badges */}
            {isInit && suspiciousList.length > 0 && (
              <View style={styles.badgeBlock}>
                <Text style={styles.badgeBlockTitle}>可信度偏低</Text>
                <BadgeList items={suspiciousList} color="#e8a020" />
              </View>
            )}

            {/* Accuracy Detail */}
            {isInit && initAcc && (
              <AccuracyBars title="模型還原準確度" grade={initAcc.grade} score={initAcc.overallScore} bars={initAcc.bars} />
            )}
            {!isInit && plaqueAcc && (
              <AccuracyBars title="菌斑分析準確度" grade={plaqueAcc.grade} score={plaqueAcc.overallScore} bars={plaqueAcc.bars} bgColor="rgba(35,157,202,0.06)" />
            )}

            <Pressable style={[styles.resetBtn, !isInit && styles.resetBtnPlaque]} onPress={reset}>
              <Feather name="refresh-cw" size={14} color={isInit ? Colors.jade : Colors.aqua} />
              <Text style={[styles.resetBtnText, !isInit && styles.resetBtnTextPlaque]}>再次掃描</Text>
            </Pressable>
          </View>
        )}

        {/* ===== FAILED ===== */}
        {status === 'failed' && (
          <View style={[styles.stateCard, styles.stateCardError]}>
            <View style={styles.errorIconWrap}>
              <Feather name="x-circle" size={44} color={Colors.redPlaque} />
            </View>
            <Text style={[styles.stateTitle, { color: Colors.redPlaque, textAlign: 'center', marginBottom: 8 }]}>
              處理失敗
            </Text>
            <Text style={[styles.stateHint, { textAlign: 'center', marginBottom: 16 }]}>{errorMsg}</Text>
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

  pageTitle:    { fontFamily: FontFamilies.heading, fontSize: 32, color: Colors.ink, marginBottom: 4 },
  pageSubtitle: { fontFamily: FontFamilies.body,    fontSize: 14, color: Colors.muted, marginBottom: 20 },

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

  // Description card — semi-transparent background
  descCard: {
    borderRadius: Radius.md,
    padding: 18, paddingLeft: 22, marginBottom: 16,
    borderWidth: 1, overflow: 'hidden', ...Shadows.sm,
  },
  descCardInit:   { backgroundColor: 'rgba(255,255,255,0.70)', borderColor: Colors.jadeAlpha12 },
  descCardPlaque: { backgroundColor: 'rgba(255,255,255,0.70)', borderColor: 'rgba(35,157,202,0.12)' },
  descAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  descEyebrow: { fontFamily: FontFamilies.body,    fontSize: 11, color: Colors.muted, letterSpacing: 0.4, marginBottom: 5 },
  descTitle:   { fontFamily: FontFamilies.display, fontSize: 20, color: Colors.ink, marginBottom: 8 },
  descBody:    { fontFamily: FontFamilies.body,    fontSize: 13, color: Colors.muted, lineHeight: 20 },
  warnRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
    padding: 10, backgroundColor: 'rgba(192,57,43,0.06)', borderRadius: Radius.sm,
  },
  warnText: { fontFamily: FontFamilies.bodyMed, fontSize: 12, color: Colors.redPlaque },

  existingModelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, borderRadius: Radius.md,
    padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.jadeAlpha12, ...Shadows.sm,
  },
  existingModelBtnPlaque: { borderColor: 'rgba(35,157,202,0.18)' },
  existingModelLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  existingModelIcon:  { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  existingModelTitle: { fontFamily: FontFamilies.bodyMed, fontSize: 14, color: Colors.ink },
  existingModelSub:   { fontFamily: FontFamilies.body,    fontSize: 12, color: Colors.muted, marginTop: 2 },

  progressWrap:   { marginBottom: 14 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressText:   { fontFamily: FontFamilies.body,    fontSize: 13, color: Colors.muted },
  progressCount:  { fontFamily: FontFamilies.bodyMed, fontSize: 13 },
  progressBar:    { height: 5, backgroundColor: Colors.jadeAlpha08, borderRadius: 99, overflow: 'hidden' },
  progressFill:   { height: '100%', borderRadius: 99 },

  mirrorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.jadeAlpha12,
  },
  mirrorToggle: {
    width: 40, height: 22, borderRadius: 11,
    backgroundColor: Colors.linenDark,
    padding: 2, justifyContent: 'center',
  },
  mirrorToggleOn:  { backgroundColor: Colors.aqua },
  mirrorThumb:     { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.white },
  mirrorThumbOn:   { alignSelf: 'flex-end' },
  mirrorLabel:     { fontFamily: FontFamilies.bodyMed, fontSize: 13, color: Colors.ink },
  mirrorHint:      { fontFamily: FontFamilies.body, fontSize: 11, color: Colors.muted, marginTop: 1 },

  uploadGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  uploadCard: {
    width: '47%', aspectRatio: 1, borderRadius: Radius.md,
    overflow: 'hidden', backgroundColor: Colors.white,
    borderWidth: 1.5, borderColor: Colors.jadeAlpha12,
    borderStyle: 'dashed', ...Shadows.sm,
  },
  uploadPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5, padding: 12 },
  uploadIconWrap:    { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  uploadNum:   { position: 'absolute', top: 10, left: 12, fontFamily: FontFamilies.bodyMed, fontSize: 11, color: Colors.linenDark },
  uploadLabel: { fontFamily: FontFamilies.bodyMed, fontSize: 13, color: Colors.inkSoft, textAlign: 'center' },
  preview:        { width: '100%', height: '100%' },
  previewOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 20, paddingBottom: 9, paddingHorizontal: 10 },
  previewLabel:   { fontFamily: FontFamilies.bodyMed, fontSize: 12, color: Colors.white },
  checkMark: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

  qualityBadge: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  qualityChecking: { backgroundColor: 'rgba(30,30,30,0.55)' },
  qualityOk:       { backgroundColor: 'rgba(3,105,94,0.80)' },
  qualityWarn:     { backgroundColor: 'rgba(200,130,0,0.85)' },
  qualityBadgeTxt: { fontFamily: FontFamilies.bodyMed, fontSize: 10, color: Colors.white, flexShrink: 1 },
  qualityTipBox: {
    backgroundColor: 'rgba(232,160,32,0.08)',
    borderRadius: Radius.md, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(232,160,32,0.20)',
    gap: 6,
  },
  qualityTipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  qualityTipTxt: { fontFamily: FontFamilies.body, fontSize: 12, color: Colors.ink, flex: 1, lineHeight: 18 },
  qualityTipView:{ fontFamily: FontFamilies.bodyMed, fontSize: 12, color: '#c07800' },

  submitBtn:         { borderRadius: Radius.xl, marginBottom: 8, ...Shadows.hero },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnInner:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingVertical: 18, paddingHorizontal: 24 },
  submitIconWrap:    { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  submitBtnText:     { fontFamily: FontFamilies.bodyMed, fontSize: 16, color: Colors.white },
  submitBtnSub:      { fontFamily: FontFamilies.body,    fontSize: 11, color: 'rgba(255,255,255,0.70)', marginTop: 2 },

  stateCard:      { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 24, borderWidth: 1, borderColor: Colors.jadeAlpha12, ...Shadows.md },
  stateCardError: { borderColor: 'rgba(192,57,43,0.15)' },

  processingHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  processingRing:   { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.jadeAlpha08, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stateTitle: { fontFamily: FontFamilies.heading, fontSize: 20, color: Colors.ink, marginBottom: 4 },
  stateHint:  { fontFamily: FontFamilies.body,    fontSize: 13, color: Colors.muted },

  doneHeader:  { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  doneIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  errorIconWrap: { width: 80, height: 80, borderRadius: 40, alignSelf: 'center', backgroundColor: 'rgba(192,57,43,0.07)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },

  statRow:      { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, backgroundColor: Colors.surface, borderRadius: Radius.md, paddingVertical: 16, paddingHorizontal: 20, marginBottom: 16, justifyContent: 'center' },
  statRowPlaque: { backgroundColor: 'rgba(35,157,202,0.06)' },
  statItem:    { alignItems: 'center', minWidth: 56 },
  statVal:     { fontFamily: FontFamilies.display, fontSize: 30, color: Colors.jade, lineHeight: 34 },
  statLabel:   { fontFamily: FontFamilies.body, fontSize: 11, color: Colors.muted, marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, height: 34, backgroundColor: Colors.jadeAlpha12 },

  viewerBtn:     { borderRadius: Radius.xl, overflow: 'hidden', marginBottom: 16, ...Shadows.hero },
  viewerBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 16 },
  viewerBtnText: { fontFamily: FontFamilies.bodyMed, fontSize: 15, color: Colors.white, flex: 1, textAlign: 'center' },

  chartBlock:       { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 16, marginBottom: 12 },
  chartBlockPlaque: { backgroundColor: 'rgba(35,157,202,0.06)' },
  blockLabel: { fontFamily: FontFamilies.bodyMed, fontSize: 11, color: Colors.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 },

  badgeBlock:      { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 14, marginBottom: 10 },
  badgeBlockTitle: { fontFamily: FontFamilies.bodyMed, fontSize: 12, color: Colors.inkSoft, marginBottom: 10 },

  resetBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: Radius.xl, borderWidth: 1.5, borderColor: Colors.jade, marginTop: 12 },
  resetBtnText:      { fontFamily: FontFamilies.bodyMed, fontSize: 14, color: Colors.jade },
  resetBtnPlaque:     { borderColor: Colors.aqua },
  resetBtnTextPlaque: { color: Colors.aqua },
});

// Step Progress Styles
const sp = StyleSheet.create({
  wrap: { gap: 4 },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: Radius.sm },
  rowActive:  { backgroundColor: 'rgba(35,157,202,0.06)' },
  rowDone:    { backgroundColor: 'rgba(109,175,95,0.07)' },
  dot:        { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.linenDark, flexShrink: 0 },
  dotActive:  { backgroundColor: Colors.aqua },
  dotDone:    { backgroundColor: Colors.jadeLight },
  info:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name:         { fontFamily: FontFamilies.bodyMed, fontSize: 14, color: Colors.inkSoft },
  nameActive:   { color: Colors.ink },
  nameDone:     { color: Colors.inkSoft },
  status:       { fontFamily: FontFamilies.body, fontSize: 12, color: Colors.muted },
  statusActive: { color: Colors.aqua },
  statusDone:   { color: Colors.jadeLight },
  barWrap: { height: 5, backgroundColor: Colors.jadeAlpha08, borderRadius: 99, overflow: 'hidden', marginTop: 8 },
  barFill: { height: '100%', borderRadius: 99 },
  pct:     { fontFamily: FontFamilies.body, fontSize: 11, color: Colors.muted, textAlign: 'right', marginTop: 4 },
});

// Tooth Chart Styles
const tc = StyleSheet.create({
  wrap:     { gap: 8 },
  jawLabel: { fontFamily: FontFamilies.bodyMed, fontSize: 11, color: Colors.muted, letterSpacing: 0.3, marginBottom: 4 },
  row:      { flexDirection: 'row', gap: 4, paddingVertical: 2 },
  chip:     { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  chipPresent: { backgroundColor: Colors.jadeAlpha12 },
  chipSuspect: { backgroundColor: 'rgba(232,160,32,0.12)', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(232,160,32,0.30)' },
  chipMissing: { backgroundColor: 'rgba(192,57,43,0.09)', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(192,57,43,0.25)' },
  chipEmpty:   { backgroundColor: Colors.jadeAlpha04 },
  num:         { fontFamily: FontFamilies.bodyMed, fontSize: 7 },
  numPresent:  { color: Colors.jade },
  numSuspect:  { color: '#c07800' },
  numMissing:  { color: Colors.redPlaque },
  divider:     { height: 1, backgroundColor: Colors.jadeAlpha08, marginVertical: 6 },
  legend:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:   { width: 10, height: 10, borderRadius: 3 },
  legendText:  { fontFamily: FontFamilies.body, fontSize: 11, color: Colors.muted },
});

const pc = StyleSheet.create({
  fill:        { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(192,57,43,0.55)' },
  missingFill: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(192,57,43,0.09)' },
});

// AccuracyBars Styles
const ab = StyleSheet.create({
  wrap:      { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 16, marginBottom: 12 },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  title:     { fontFamily: FontFamilies.bodyMed, fontSize: 13, color: Colors.ink, flex: 1 },
  gradeBadge:{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  gradeText: { fontFamily: FontFamilies.display, fontSize: 15, color: Colors.white },
  scoreText: { fontFamily: FontFamilies.bodyMed, fontSize: 13, color: Colors.inkSoft },
  row:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  rowSub:    { opacity: 0.75, marginLeft: 8 },
  label:     { fontFamily: FontFamilies.body, fontSize: 12, color: Colors.inkSoft, width: 72 },
  labelSub:  { fontSize: 11, color: Colors.muted },
  barWrap:   { flex: 1, height: 6, backgroundColor: Colors.jadeAlpha08, borderRadius: 99, overflow: 'hidden' },
  bar:       { height: '100%', borderRadius: 99 },
  pct:       { fontFamily: FontFamilies.body, fontSize: 11, color: Colors.muted, width: 34, textAlign: 'right' },
  note:      { fontFamily: FontFamilies.body, fontSize: 10, color: Colors.linenDark, marginTop: 8, lineHeight: 16 },
});

// Badge List Styles
const bl = StyleSheet.create({
  wrap:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
  text:  { fontFamily: FontFamilies.bodyMed, fontSize: 12 },
});
