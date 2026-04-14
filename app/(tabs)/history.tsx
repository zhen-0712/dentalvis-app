// ===== 歷史記錄頁面 =====
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Radius, Shadows, FontFamilies } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { fetchAnalyses } from '../../services/api';

type Analysis = {
  id: number;
  type: 'init' | 'plaque';
  status: 'queued' | 'running' | 'done' | 'failed';
  created_at: string;
  completed_at: string | null;
  result: any;
};

function gradeColor(g: string) {
  return g === 'A' ? Colors.jade : g === 'B' ? Colors.jadeLight : g === 'C' ? '#e8a020' : Colors.redPlaque;
}

function calcToothAccuracy(t: any) {
  if (!t || !t.teeth) return null;
  const total = Object.keys(t.teeth).length;
  if (total === 0) return null;
  const detected = (t.detected_teeth || []).length;
  const never    = (t.never_detected || []).length;
  const coverage = detected / (detected + never || 1);
  const confidences = Object.values(t.teeth).map((x: any) => x.confidence || 0);
  const avgConf = confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length;
  const multiView = Object.values(t.teeth).filter((x: any) => x.num_views >= 2).length / total;
  const score = coverage * 0.35 + avgConf * 0.40 + multiView * 0.25;
  return { score, grade: score >= 0.85 ? 'A' : score >= 0.70 ? 'B' : score >= 0.55 ? 'C' : 'D' };
}

function AnalysisCard({ a, expanded, onToggle }: { a: Analysis; expanded: boolean; onToggle: () => void }) {
  const typeLabel = a.type === 'init' ? '初始化' : '菌斑分析';
  const statusDotColor = {
    done: Colors.jadeLight,
    failed: Colors.redPlaque,
    running: Colors.aqua,
    queued: Colors.aquaLight,
  }[a.status];

  const statusText = { done: '完成', failed: '失敗', running: '進行中', queued: '等待中' }[a.status];

  const date = new Date(a.created_at).toLocaleString('zh-TW', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  let summaryContent = null;
  if (a.status === 'done' && a.result) {
    if (a.type === 'plaque' && a.result.stats) {
      const s = a.result.stats;
      const ratio = s.plaque_ratio != null ? `${(s.plaque_ratio * 100).toFixed(1)}%` : '—';
      const teeth = Object.keys(s.fdi_plaque_summary || {}).length;
      summaryContent = (
        <View style={styles.cardSummary}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: Colors.redPlaque }]}>{ratio}</Text>
            <Text style={styles.summaryLabel}>菌斑覆蓋率</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{teeth}</Text>
            <Text style={styles.summaryLabel}>有菌斑牙齒</Text>
          </View>
        </View>
      );
    } else if (a.type === 'init' && a.result.tooth_analysis) {
      const t = a.result.tooth_analysis;
      const acc = calcToothAccuracy(t);
      summaryContent = (
        <View style={styles.cardSummary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{t.total_detected ?? '—'}</Text>
            <Text style={styles.summaryLabel}>偵測牙齒</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{(t.never_detected || []).length}</Text>
            <Text style={styles.summaryLabel}>未偵測到</Text>
          </View>
          {acc && (
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: gradeColor(acc.grade), fontSize: 28 }]}>
                {acc.grade}
              </Text>
              <Text style={styles.summaryLabel}>模型準確度</Text>
            </View>
          )}
        </View>
      );
    }
  }

  return (
    <View style={styles.card}>
      <Pressable style={styles.cardHeader} onPress={onToggle}>
        <View style={styles.cardMeta}>
          <View style={[styles.typeBadge, a.type === 'plaque' && styles.typeBadgePlaque]}>
            <Text style={[styles.typeBadgeText, a.type === 'plaque' && styles.typeBadgePlaqueTxt]}>
              {typeLabel}
            </Text>
          </View>
          <Text style={styles.cardDate}>{date}</Text>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.statusDot, { backgroundColor: statusDotColor }]} />
          <Text style={styles.statusText}>{statusText}</Text>
          <Text style={{ color: Colors.muted, fontSize: 16 }}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </Pressable>

      {summaryContent}

      {expanded && a.status === 'done' && a.result && (
        <View style={styles.cardDetail}>
          {a.type === 'init' && a.result.tooth_analysis && (
            <Text style={styles.detailText}>
              {`偵測牙齒：${a.result.tooth_analysis.total_detected}\n`}
              {`未偵測：${(a.result.tooth_analysis.never_detected || []).join(', ') || '無'}`}
            </Text>
          )}
          {a.type === 'plaque' && a.result.stats && (
            <Text style={styles.detailText}>
              {`菌斑覆蓋率：${a.result.stats.plaque_ratio != null ? (a.result.stats.plaque_ratio * 100).toFixed(1) + '%' : '—'}\n`}
              {`有菌斑牙齒：${Object.keys(a.result.stats.fdi_plaque_summary || {}).join(', ')}`}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function HistoryScreen() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'week' | 'month' | 'all'>('all');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetchAnalyses()
      .then(data => setAnalyses(data))
      .finally(() => setLoading(false));
  }, [user]);

  const filteredAnalyses = analyses.filter(a => {
    const d = new Date(a.created_at);
    const now = new Date();
    if (filter === 'week') {
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
      return d >= weekAgo;
    }
    if (filter === 'month') {
      const monthAgo = new Date(now); monthAgo.setMonth(now.getMonth() - 1);
      return d >= monthAgo;
    }
    return true;
  });

  const toggleCard = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🔒</Text>
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
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>歷史記錄</Text>
        <Text style={styles.pageDesc}>點擊卡片查看詳細結果</Text>

        {/* Filter */}
        <View style={styles.filterWrap}>
          {(['week', 'month', 'all'] as const).map(f => (
            <Pressable
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'week' ? '本週' : f === 'month' ? '本月' : '全部'}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.jade} style={{ marginTop: 40 }} />
        ) : filteredAnalyses.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>
              {filter === 'week' ? '本週' : filter === 'month' ? '本月' : ''}尚無分析記錄
            </Text>
          </View>
        ) : (
          filteredAnalyses.map(a => (
            <AnalysisCard
              key={a.id}
              a={a}
              expanded={expanded.has(a.id)}
              onToggle={() => toggleCard(a.id)}
            />
          ))
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
    paddingVertical: 8,
    borderRadius: Radius.xl,
    alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: Colors.jade },
  filterText: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 14,
    color: Colors.muted,
  },
  filterTextActive: { color: Colors.white },

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
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: Colors.jadeAlpha08,
  },
  typeBadgePlaque: { backgroundColor: 'rgba(35,157,202,0.10)' },
  typeBadgeText: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 12,
    color: Colors.jade,
  },
  typeBadgePlaqueTxt: { color: Colors.aqua },
  cardDate: {
    fontFamily: FontFamilies.body,
    fontSize: 13,
    color: Colors.muted,
  },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: {
    fontFamily: FontFamilies.body,
    fontSize: 13,
    color: Colors.muted,
  },

  cardSummary: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 24,
  },
  summaryItem: { alignItems: 'center' },
  summaryVal: {
    fontFamily: FontFamilies.display,
    fontSize: 24,
    color: Colors.jade,
  },
  summaryLabel: {
    fontFamily: FontFamilies.body,
    fontSize: 11,
    color: Colors.muted,
  },

  cardDetail: {
    borderTopWidth: 1,
    borderTopColor: Colors.jadeAlpha08,
    padding: 16,
  },
  detailText: {
    fontFamily: FontFamilies.body,
    fontSize: 13,
    color: Colors.muted,
    lineHeight: 22,
  },

  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontFamily: FontFamilies.display,
    fontSize: 20,
    color: Colors.ink,
  },
  emptyDesc: {
    fontFamily: FontFamilies.body,
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
  },
  loginBtn: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: Radius.xl,
    backgroundColor: Colors.jade,
    ...Shadows.md,
  },
  loginBtnText: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 15,
    color: Colors.white,
  },
});
