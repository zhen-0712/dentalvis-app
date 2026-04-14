// ===== 首頁 / Dashboard =====
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Shadows, FontFamilies, Gradients } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { fetchModelStatus } from '../../services/api';

export default function HomeScreen() {
  const { user } = useAuth();
  const [modelReady, setModelReady] = useState<boolean | null>(null);

  useEffect(() => {
    fetchModelStatus()
      .then(d => setModelReady(d.model_ready))
      .catch(() => setModelReady(false));
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {user ? `嗨，${user.name}` : '歡迎使用'}
            </Text>
            <Text style={styles.brand}>DentalVis</Text>
          </View>
          <Pressable
            style={styles.avatarBtn}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={styles.avatarText}>
              {user ? user.name[0].toUpperCase() : '?'}
            </Text>
          </Pressable>
        </View>

        {/* Hero Card */}
        <LinearGradient
          colors={Gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.heroEyebrow}>AI 驅動的牙齒健康視覺化</Text>
          <Text style={styles.heroTitle}>看見牙菌斑{'\n'}的真實分布</Text>
          <Text style={styles.heroDesc}>
            上傳五個角度的牙齒照片，系統將自動建立個人化 3D 模型並標示菌斑位置
          </Text>
          <Pressable
            style={styles.heroBtn}
            onPress={() => router.push('/(tabs)/scan')}
          >
            <Text style={styles.heroBtnText}>開始掃描</Text>
          </Pressable>
        </LinearGradient>

        {/* Model Status */}
        <View style={styles.statusCard}>
          <View style={[
            styles.statusDot,
            modelReady === true  && styles.statusDotReady,
            modelReady === false && styles.statusDotNotReady,
          ]} />
          <Text style={styles.statusText}>
            {modelReady === null
              ? '檢查模型狀態中...'
              : modelReady
                ? '3D 模型已建立，可直接進行菌斑分析'
                : '尚未建立 3D 模型，請先完成初始化'}
          </Text>
          {modelReady === null && (
            <ActivityIndicator size="small" color={Colors.jade} style={{ marginLeft: 8 }} />
          )}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>快速操作</Text>
        <View style={styles.actionGrid}>
          <Pressable
            style={[styles.actionCard, styles.actionCardPrimary]}
            onPress={() => router.push('/(tabs)/scan')}
          >
            <Text style={styles.actionIcon}>⚙️</Text>
            <Text style={styles.actionLabel}>初始化模型</Text>
            <Text style={styles.actionSub}>一次性設定</Text>
          </Pressable>

          <Pressable
            style={[styles.actionCard, styles.actionCardAqua]}
            onPress={() => router.push('/(tabs)/scan')}
          >
            <Text style={styles.actionIcon}>🔍</Text>
            <Text style={styles.actionLabel}>菌斑分析</Text>
            <Text style={styles.actionSub}>可重複執行</Text>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/history')}
          >
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionLabel}>歷史記錄</Text>
            <Text style={styles.actionSub}>查看過去分析</Text>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={styles.actionIcon}>👤</Text>
            <Text style={styles.actionLabel}>我的帳號</Text>
            <Text style={styles.actionSub}>個人設定</Text>
          </Pressable>
        </View>

        {/* About */}
        <Text style={styles.sectionTitle}>系統特色</Text>
        {[
          { icon: '🗂️', title: '多角度融合', desc: '整合五個拍攝角度的資訊，建立準確的個人化牙齒 3D 模型。' },
          { icon: '📍', title: '精準定位', desc: '依照 FDI 國際牙齒編號系統，標示每顆牙上的菌斑位置。' },
          { icon: '🔗', title: '輕鬆分享', desc: '輸出 GLB / OBJ 格式，可直接與牙醫分享或在手機上瀏覽。' },
        ].map(item => (
          <View key={item.title} style={styles.featureCard}>
            <Text style={styles.featureIcon}>{item.icon}</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.footer}>DentalVis © 2026 · NCU Dental AI Lab</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: 20, paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontFamily: FontFamilies.body,
    fontSize: 14,
    color: Colors.muted,
  },
  brand: {
    fontFamily: FontFamilies.display,
    fontSize: 28,
    color: Colors.jade,
  },
  avatarBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: Colors.jade,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 16,
    color: Colors.white,
  },

  heroCard: {
    borderRadius: Radius.lg,
    padding: 24,
    marginBottom: 16,
    ...Shadows.md,
  },
  heroEyebrow: {
    fontFamily: FontFamilies.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  heroTitle: {
    fontFamily: FontFamilies.display,
    fontSize: 28,
    color: Colors.white,
    lineHeight: 36,
    marginBottom: 12,
  },
  heroDesc: {
    fontFamily: FontFamilies.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
    marginBottom: 20,
  },
  heroBtn: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'flex-start',
  },
  heroBtnText: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 15,
    color: Colors.jade,
  },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.jadeAlpha12,
    ...Shadows.sm,
  },
  statusDot: {
    width: 10, height: 10,
    borderRadius: 5,
    backgroundColor: Colors.linenDark,
    marginRight: 10,
    flexShrink: 0,
  },
  statusDotReady:    { backgroundColor: Colors.jadeLight },
  statusDotNotReady: { backgroundColor: Colors.aquaLight },
  statusText: {
    fontFamily: FontFamilies.body,
    fontSize: 13,
    color: Colors.inkSoft,
    flex: 1,
  },

  sectionTitle: {
    fontFamily: FontFamilies.display,
    fontSize: 20,
    color: Colors.ink,
    marginBottom: 12,
  },

  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  actionCard: {
    width: '47%',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.jadeAlpha08,
    ...Shadows.sm,
  },
  actionCardPrimary: {
    backgroundColor: Colors.jade,
    borderColor: Colors.jade,
  },
  actionCardAqua: {
    backgroundColor: Colors.aqua,
    borderColor: Colors.aqua,
  },
  actionIcon: { fontSize: 24, marginBottom: 8 },
  actionLabel: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 15,
    color: Colors.ink,
    marginBottom: 2,
  },
  actionSub: {
    fontFamily: FontFamilies.body,
    fontSize: 12,
    color: Colors.muted,
  },

  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.jadeAlpha08,
    gap: 14,
  },
  featureIcon: { fontSize: 24, marginTop: 2 },
  featureText: { flex: 1 },
  featureTitle: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 15,
    color: Colors.ink,
    marginBottom: 4,
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
    color: Colors.muted,
    textAlign: 'center',
    marginTop: 24,
  },
});
