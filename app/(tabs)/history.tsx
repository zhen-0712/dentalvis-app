import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Dimensions,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Radius, Shadows, FontFamilies, Gradients } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { fetchAnalyses } from '../../services/api';

type Analysis = {
  id: number;
  type: 'init' | 'plaque';
  status: 'queued' | 'running' | 'done' | 'failed';
  created_at: string;
  result: any;
};

function gradeColor(g: string) {
  return g === 'A' ? Colors.jade : g === 'B' ? Colors.jadeLight : g === 'C' ? '#e8a020' : Colors.redPlaque;
}

function calcToothAccuracy(t: any) {
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

function AnalysisCard({ a, expanded, onToggle }: { a: Analysis; expanded: boolean; onToggle: () => void }) {
  const isPlaque = a.type === 'plaque';
  const isDone   = a.status === 'done';
  const date = new Date(a.created_at).toLocaleString('zh-TW', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const statusConfig = {
    done:    { color: Colors.jadeLight,  label: '完成' },
    failed:  { color: Colors.redPlaque,  label: '失敗' },
    running: { color: Colors.aqua,       label: '進行中' },
    queued:  { color: Colors.aquaLight,  label: '等待中' },
  }[a.status] ?? { color: Colors.muted, label: a.status };

  return (
    <View style={styles.card}>
      <Pressable style={styles.cardHeader} onPress={onToggle}>
        <View style={[styles.cardTypeBar, { backgroundColor: isPlaque ? Colors.aqua : Colors.jade }]} />
        <View style={styles.cardLeft}>
          <View style={[styles.typeBadge, isPlaque && styles.typeBadgePlaque]}>
            <Feather
              name={isPlaque ? 'search' : 'cpu'}
              size={11}
              color={isPlaque ? Colors.aqua : Colors.jade}
            />
            <Text style={[styles.typeBadgeText, isPlaque && styles.typeBadgePlaqueTxt]}>
              {isPlaque ? '菌斑分析' : '初始化'}
            </Text>
          </View>
          <Text style={styles.cardDate}>{date}</Text>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
          <Text style={styles.statusText}>{statusConfig.label}</Text>
          <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.muted} />
        </View>
      </Pressable>

      {isDone && a.result && (
        <View style={styles.cardSummary}>
          {isPlaque && a.result.stats && (() => {
            const ratio = a.result.stats.plaque_ratio != null
              ? `${(a.result.stats.plaque_ratio * 100).toFixed(1)}%` : '—';
            const teeth = Object.keys(a.result.stats.fdi_plaque_summary || {}).length;
            return (
              <>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryVal, { color: Colors.redPlaque }]}>{ratio}</Text>
                  <Text style={styles.summaryLabel}>菌斑覆蓋率</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryVal}>{teeth}</Text>
                  <Text style={styles.summaryLabel}>有菌斑牙齒</Text>
                </View>
              </>
            );
          })()}
          {!isPlaque && a.result.tooth_analysis && (() => {
            const t   = a.result.tooth_analysis;
            const acc = calcToothAccuracy(t);
            return (
              <>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryVal}>{t.total_detected ?? '—'}</Text>
                  <Text style={styles.summaryLabel}>偵測牙齒</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryVal}>{(t.never_detected || []).length}</Text>
                  <Text style={styles.summaryLabel}>未偵測到</Text>
                </View>
                {acc && (
                  <>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryVal, { color: gradeColor(acc.grade), fontSize: 28 }]}>
                        {acc.grade}
                      </Text>
                      <Text style={styles.summaryLabel}>準確度</Text>
                    </View>
                  </>
                )}
              </>
            );
          })()}
        </View>
      )}

      {expanded && isDone && a.result && (
        <View style={styles.cardDetail}>
          {!isPlaque && a.result.tooth_analysis && (
            <Text style={styles.detailText}>
              {`偵測牙齒：${a.result.tooth_analysis.total_detected}\n`}
              {`未偵測：${(a.result.tooth_analysis.never_detected || []).join(', ') || '無'}`}
            </Text>
          )}
          {isPlaque && a.result.stats && (
            <Text style={styles.detailText}>
              {`菌斑覆蓋率：${a.result.stats.plaque_ratio != null
                ? (a.result.stats.plaque_ratio * 100).toFixed(1) + '%' : '—'}\n`}
              {`有菌斑牙齒：${Object.keys(a.result.stats.fdi_plaque_summary || {}).join(', ')}`}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const SCREEN_W = Dimensions.get('window').width - 40; // 20px padding each side

function TrendSection({ analyses }: { analyses: Analysis[] }) {
  const plaque = analyses
    .filter(a => a.type === 'plaque' && a.status === 'done' && a.result?.stats?.plaque_ratio != null)
    .map(a => ({
      x: new Date(a.created_at).getTime(),
      y: parseFloat((a.result.stats.plaque_ratio * 100).toFixed(1)),
      label: new Date(a.created_at).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }),
    }))
    .sort((a, b) => a.x - b.x);

  if (plaque.length < 2) return null;

  const PAD = { top: 16, bottom: 32, left: 38, right: 12 };
  const chartW = SCREEN_W - PAD.left - PAD.right;
  const chartH = 140;

  const minY = Math.max(0, Math.min(...plaque.map(p => p.y)) - 5);
  const maxY = Math.min(100, Math.max(...plaque.map(p => p.y)) + 5);
  const rangeY = maxY - minY || 1;

  const toX = (i: number) => (i / (plaque.length - 1)) * chartW;
  const toY = (v: number) => chartH - ((v - minY) / rangeY) * chartH;

  const points = plaque.map((p, i) => `${toX(i)},${toY(p.y)}`).join(' ');

  // Y axis ticks: 4 evenly spaced
  const yTicks = Array.from({ length: 4 }, (_, i) => {
    const val = minY + (rangeY / 3) * i;
    return { val: Math.round(val), y: toY(val) };
  });

  // X axis: show at most 5 labels
  const step = Math.ceil(plaque.length / 5);
  const xLabels = plaque
    .map((p, i) => ({ label: p.label, x: toX(i), show: i % step === 0 || i === plaque.length - 1 }))
    .filter(l => l.show);

  return (
    <View style={styles.trendCard}>
      <Text style={styles.blockTitle}>菌斑覆蓋率趨勢</Text>
      <Text style={styles.trendSub}>依時間顯示每次菌斑分析結果</Text>
      <Svg
        width={SCREEN_W}
        height={chartH + PAD.top + PAD.bottom}
        style={{ marginTop: 8 }}
      >
        {/* Grid lines + Y labels */}
        {yTicks.map(t => (
          <React.Fragment key={t.val}>
            <Line
              x1={PAD.left} y1={PAD.top + t.y}
              x2={PAD.left + chartW} y2={PAD.top + t.y}
              stroke="rgba(3,105,94,0.08)" strokeWidth={1}
            />
            <SvgText
              x={PAD.left - 4} y={PAD.top + t.y + 4}
              fontSize={9} fill={Colors.muted} textAnchor="end"
            >{t.val}%</SvgText>
          </React.Fragment>
        ))}

        {/* X axis line */}
        <Line
          x1={PAD.left} y1={PAD.top + chartH}
          x2={PAD.left + chartW} y2={PAD.top + chartH}
          stroke="rgba(3,105,94,0.12)" strokeWidth={1}
        />

        {/* X labels */}
        {xLabels.map(l => (
          <SvgText
            key={l.label + l.x}
            x={PAD.left + l.x} y={PAD.top + chartH + 14}
            fontSize={9} fill={Colors.muted} textAnchor="middle"
          >{l.label}</SvgText>
        ))}

        {/* Line */}
        <Polyline
          points={plaque.map((p, i) => `${PAD.left + toX(i)},${PAD.top + toY(p.y)}`).join(' ')}
          fill="none"
          stroke={Colors.aqua}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Dots */}
        {plaque.map((p, i) => (
          <Circle
            key={i}
            cx={PAD.left + toX(i)} cy={PAD.top + toY(p.y)}
            r={4}
            fill={Colors.white}
            stroke={Colors.aqua}
            strokeWidth={2}
          />
        ))}
      </Svg>
    </View>
  );
}

export default function HistoryScreen() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<'week' | 'month' | 'all'>('all');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Re-fetch every time the tab comes into focus so newly completed analyses appear
  useFocusEffect(useCallback(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    fetchAnalyses().then(setAnalyses).finally(() => setLoading(false));
  }, [user]));

  const filtered = analyses.filter(a => {
    const d = new Date(a.created_at);
    const now = new Date();
    if (filter === 'week')  { const w = new Date(now); w.setDate(now.getDate() - 7);  return d >= w; }
    if (filter === 'month') { const m = new Date(now); m.setMonth(now.getMonth() - 1); return d >= m; }
    return true;
  });

  const toggle = (id: number) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.emptyWrap}>
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.emptyIconWrap}
          >
            <Feather name="lock" size={28} color={Colors.white} />
          </LinearGradient>
          <Text style={styles.emptyTitle}>請先登入</Text>
          <Text style={styles.emptyDesc}>登入後即可查看您的分析歷史記錄</Text>
          <Pressable style={styles.loginBtn} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginBtnText}>登入 / 註冊</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>歷史記錄</Text>
        <Text style={styles.pageDesc}>點擊卡片展開查看詳細結果</Text>

        {/* Filter */}
        <View style={styles.filterWrap}>
          {(['week', 'month', 'all'] as const).map(f => (
            filter === f ? (
              <LinearGradient
                key={f}
                colors={Gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.filterBtnActive}
              >
                <Text style={styles.filterTextActive}>
                  {f === 'week' ? '本週' : f === 'month' ? '本月' : '全部'}
                </Text>
              </LinearGradient>
            ) : (
              <Pressable key={f} style={styles.filterBtn} onPress={() => setFilter(f)}>
                <Text style={styles.filterText}>
                  {f === 'week' ? '本週' : f === 'month' ? '本月' : '全部'}
                </Text>
              </Pressable>
            )
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.jade} style={{ marginTop: 60 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyInline}>
            <Feather name="inbox" size={28} color={Colors.linenDark} />
            <Text style={styles.emptyTitle}>尚無分析記錄</Text>
          </View>
        ) : (
          <>
            {filtered.map(a => (
              <AnalysisCard
                key={a.id}
                a={a}
                expanded={expanded.has(a.id)}
                onToggle={() => toggle(a.id)}
              />
            ))}
            <TrendSection analyses={filtered} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: 20, paddingBottom: 48 },

  pageTitle: {
    fontFamily: FontFamilies.heading,
    fontSize: 32,
    color: Colors.ink,
    marginBottom: 4,
  },
  pageDesc: {
    fontFamily: FontFamilies.body,
    fontSize: 14,
    color: Colors.muted,
    marginBottom: 20,
  },

  filterWrap: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.jadeAlpha12,
    marginBottom: 20,
    gap: 4,
    ...Shadows.sm,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.xl,
    alignItems: 'center',
  },
  filterBtnActive: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.xl,
    alignItems: 'center',
  },
  filterText: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 13,
    color: Colors.muted,
  },
  filterTextActive: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 13,
    color: Colors.white,
  },

  // Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.jadeAlpha08,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  cardTypeBar: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingLeft: 8 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: Colors.jadeAlpha08,
  },
  typeBadgePlaque: { backgroundColor: 'rgba(35,157,202,0.10)' },
  typeBadgeText: {
    fontFamily: FontFamilies.bodyMed, fontSize: 11, color: Colors.jade,
  },
  typeBadgePlaqueTxt: { color: Colors.aqua },
  cardDate: {
    fontFamily: FontFamilies.body, fontSize: 12, color: Colors.muted,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: {
    fontFamily: FontFamilies.body, fontSize: 12, color: Colors.muted,
  },

  cardSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 4,
    gap: 16,
  },
  summaryItem: { alignItems: 'center' },
  summaryVal: {
    fontFamily: FontFamilies.display, fontSize: 26, color: Colors.jade,
  },
  summaryLabel: {
    fontFamily: FontFamilies.body, fontSize: 11, color: Colors.muted, marginTop: 2,
  },
  summaryDivider: {
    width: 1, height: 32, backgroundColor: Colors.jadeAlpha08,
  },

  cardDetail: {
    borderTopWidth: 1,
    borderTopColor: Colors.jadeAlpha08,
    padding: 16,
    backgroundColor: Colors.white,
  },
  detailText: {
    fontFamily: FontFamilies.body, fontSize: 13, color: Colors.muted, lineHeight: 22,
  },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 14,
    marginTop: 60,
  },
  emptyInline: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyIconWrap: {
    width: 76, height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    ...Shadows.md,
  },
  emptyTitle: {
    fontFamily: FontFamilies.display, fontSize: 22, color: Colors.ink,
  },
  emptyDesc: {
    fontFamily: FontFamilies.body, fontSize: 14, color: Colors.muted,
    textAlign: 'center', lineHeight: 22,
  },
  loginBtn: {
    marginTop: 8,
    paddingVertical: 15,
    paddingHorizontal: 36,
    borderRadius: Radius.xl,
    backgroundColor: Colors.jade,
    ...Shadows.md,
  },
  loginBtnText: {
    fontFamily: FontFamilies.bodyMed, fontSize: 15, color: Colors.white,
  },

  trendCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.jadeAlpha08,
    ...Shadows.sm,
  },
  blockTitle: {
    fontFamily: FontFamilies.bodyMed, fontSize: 12, color: Colors.muted,
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 2, fontWeight: '600',
  },
  trendSub: {
    fontFamily: FontFamilies.body, fontSize: 12, color: Colors.linenDark, marginBottom: 4,
  },
});
