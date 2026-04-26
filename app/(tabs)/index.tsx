import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Shadows, FontFamilies, Gradients } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { fetchModelStatus } from '../../services/api';

type ActionItem = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  sub: string;
  onPress: () => void;
  variant?: 'primary' | 'aqua' | 'default';
};

type FeatureItem = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  desc: string;
  color: string;
};

export default function HomeScreen() {
  const { user } = useAuth();
  const [modelReady, setModelReady] = useState<boolean | null>(null);

  useEffect(() => {
    fetchModelStatus()
      .then(d => setModelReady(d.model_ready))
      .catch(() => setModelReady(false));
  }, []);

  const actions: ActionItem[] = [
    { icon: 'cpu',    label: '初始化模型', sub: '一次性設定',   onPress: () => router.push('/(tabs)/scan'),    variant: 'primary' },
    { icon: 'search', label: '菌斑分析',   sub: '可重複執行',   onPress: () => router.push('/(tabs)/scan'),    variant: 'aqua' },
    { icon: 'clock',  label: '歷史記錄',   sub: '查看過去分析', onPress: () => router.push('/(tabs)/history'), variant: 'default' },
    { icon: 'user',   label: '我的帳號',   sub: '個人設定',     onPress: () => router.push('/(tabs)/profile'), variant: 'default' },
  ];

  const features: FeatureItem[] = [
    { icon: 'grid',    title: '多角度融合', desc: '整合五個拍攝角度的資訊，建立準確的個人化牙齒 3D 模型。',   color: Colors.jade },
    { icon: 'map-pin', title: '精準定位',   desc: '依照 FDI 國際牙齒編號系統，標示每顆牙上的菌斑位置。',   color: Colors.aqua },
    { icon: 'share-2', title: '輕鬆分享',   desc: '輸出 GLB / OBJ 格式，可直接與牙醫分享或在手機上瀏覽。', color: Colors.jadeLight },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{user ? `嗨，${user.name}` : '歡迎使用'}</Text>
            <Text style={styles.brand}>Smile Guardian</Text>
          </View>
          <Pressable style={styles.avatarBtn} onPress={() => router.push('/(tabs)/profile')}>
            <LinearGradient
              colors={Gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGrad}
            >
              <Text style={styles.avatarText}>{user ? user.name[0].toUpperCase() : '?'}</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Hero Card */}
        <LinearGradient
          colors={Gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          {/* Decorative blobs */}
          <View style={styles.heroDeco1} />
          <View style={styles.heroDeco2} />
          <View style={styles.heroDeco3} />

          <View style={styles.heroBadge}>
            <Feather name="zap" size={11} color="rgba(255,255,255,0.9)" />
            <Text style={styles.heroBadgeText}>AI 驅動的牙齒健康視覺化</Text>
          </View>
          <Text style={styles.heroTitle}>看見牙菌斑{'\n'}的真實分布</Text>
          <Text style={styles.heroDesc}>
            上傳五個角度的牙齒照片，系統自動建立個人化 3D 模型並標示菌斑位置
          </Text>
          <Pressable style={styles.heroBtn} onPress={() => router.push('/(tabs)/scan')}>
            <Text style={styles.heroBtnText}>開始掃描</Text>
            <Feather name="arrow-right" size={14} color={Colors.jade} />
          </Pressable>
        </LinearGradient>

        {/* Model Status */}
        <View style={styles.statusCard}>
          <View style={[
            styles.statusDot,
            modelReady === true  && styles.statusDotReady,
            modelReady === false && styles.statusDotOff,
          ]} />
          <Text style={styles.statusText}>
            {modelReady === null
              ? '檢查模型狀態中...'
              : modelReady
                ? '3D 模型已建立，可直接進行菌斑分析'
                : '尚未建立 3D 模型，請先完成初始化'}
          </Text>
          {modelReady === null && (
            <ActivityIndicator size="small" color={Colors.jade} style={{ marginLeft: 6 }} />
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>快速操作</Text>
          <View style={styles.sectionLine} />
        </View>
        <View style={styles.actionGrid}>
          {actions.map(item => {
            const isPrimary = item.variant === 'primary';
            const isAqua    = item.variant === 'aqua';
            const isColored = isPrimary || isAqua;

            if (isColored) {
              return (
                <LinearGradient
                  key={item.label}
                  colors={isPrimary ? Gradients.primary : Gradients.plaque}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionCard}
                >
                  <Pressable style={styles.actionCardInner} onPress={item.onPress}>
                    <View style={styles.actionIconWrapLight}>
                      <Feather name={item.icon} size={20} color="rgba(255,255,255,0.95)" />
                    </View>
                    <Text style={styles.actionLabelLight}>{item.label}</Text>
                    <Text style={styles.actionSubLight}>{item.sub}</Text>
                  </Pressable>
                </LinearGradient>
              );
            }

            return (
              <Pressable key={item.label} style={[styles.actionCard, styles.actionCardDefault]} onPress={item.onPress}>
                <View style={styles.actionCardInner}>
                  <View style={styles.actionIconWrap}>
                    <Feather name={item.icon} size={20} color={Colors.jade} />
                  </View>
                  <Text style={styles.actionLabel}>{item.label}</Text>
                  <Text style={styles.actionSub}>{item.sub}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Features */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>系統特色</Text>
          <View style={styles.sectionLine} />
        </View>
        {features.map(item => (
          <View key={item.title} style={styles.featureCard}>
            <View style={[styles.featureAccent, { backgroundColor: item.color }]} />
            <View style={[styles.featureIconWrap, { backgroundColor: `${item.color}14` }]}>
              <Feather name={item.icon} size={18} color={item.color} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.footer}>Smile Guardian © 2026 · NCU Dental AI Lab</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: 20, paddingBottom: 52 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  greeting: {
    fontFamily: FontFamilies.body,
    fontSize: 13,
    color: Colors.muted,
    marginBottom: 2,
  },
  brand: {
    fontFamily: FontFamilies.display,
    fontSize: 32,
    color: Colors.jade,
    lineHeight: 36,
  },
  avatarBtn: {
    borderRadius: 22,
    overflow: 'hidden',
    ...Shadows.md,
  },
  avatarGrad: {
    width: 44, height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 17,
    color: Colors.white,
  },

  // Hero
  heroCard: {
    borderRadius: Radius.lg,
    padding: 26,
    marginBottom: 14,
    overflow: 'hidden',
    ...Shadows.hero,
  },
  heroDeco1: {
    position: 'absolute',
    width: 220, height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -70, right: -50,
  },
  heroDeco2: {
    position: 'absolute',
    width: 140, height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -40, right: 50,
  },
  heroDeco3: {
    position: 'absolute',
    width: 80, height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: 20, right: 110,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start',
    borderRadius: 99,
    paddingHorizontal: 11,
    paddingVertical: 5,
    marginBottom: 16,
  },
  heroBadgeText: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 11,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontFamily: FontFamilies.heading,
    fontSize: 32,
    color: Colors.white,
    lineHeight: 40,
    marginBottom: 12,
  },
  heroDesc: {
    fontFamily: FontFamilies.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.80)',
    lineHeight: 22,
    marginBottom: 24,
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    paddingVertical: 13,
    paddingHorizontal: 22,
    alignSelf: 'flex-start',
  },
  heroBtnText: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 14,
    color: Colors.jade,
  },

  // Status
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: Colors.jadeAlpha08,
    ...Shadows.sm,
  },
  statusDot: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: Colors.linenDark,
    marginRight: 11,
    flexShrink: 0,
  },
  statusDotReady: { backgroundColor: Colors.jadeLight },
  statusDotOff:   { backgroundColor: Colors.aquaLight },
  statusText: {
    fontFamily: FontFamilies.body,
    fontSize: 13,
    color: Colors.inkSoft,
    flex: 1,
    lineHeight: 19,
  },

  // Section heading
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: FontFamilies.heading,
    fontSize: 22,
    color: Colors.ink,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.jadeAlpha12,
  },

  // Action Grid
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  actionCard: {
    width: '47%',
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadows.md,
  },
  actionCardDefault: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.jadeAlpha08,
  },
  actionCardInner: {
    padding: 18,
  },
  actionIconWrap: {
    width: 40, height: 40,
    borderRadius: 11,
    backgroundColor: Colors.jadeAlpha08,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionIconWrapLight: {
    width: 40, height: 40,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionLabel: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 15,
    color: Colors.ink,
    marginBottom: 3,
  },
  actionLabelLight: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 15,
    color: Colors.white,
    marginBottom: 3,
  },
  actionSub: {
    fontFamily: FontFamilies.body,
    fontSize: 12,
    color: Colors.muted,
  },
  actionSubLight: {
    fontFamily: FontFamilies.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.70)',
  },

  // Features
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.jadeAlpha08,
    gap: 14,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  featureAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  featureIconWrap: {
    width: 42, height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: 6,
  },
  featureText: { flex: 1 },
  featureTitle: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 15,
    color: Colors.ink,
    marginBottom: 5,
  },
  featureDesc: {
    fontFamily: FontFamilies.body,
    fontSize: 13,
    color: Colors.muted,
    lineHeight: 20,
  },

  footer: {
    fontFamily: FontFamilies.body,
    fontSize: 12,
    color: Colors.linenDark,
    textAlign: 'center',
    marginTop: 32,
  },
});
