import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Radius, Shadows, FontFamilies, Gradients } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';

type InfoRow = { icon: keyof typeof Feather.glyphMap; label: string; value: string };

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () =>
    Alert.alert('登出', '確定要登出嗎？', [
      { text: '取消', style: 'cancel' },
      { text: '登出', style: 'destructive', onPress: async () => { await logout(); } },
    ]);

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.guestWrap}>
          <LinearGradient
            colors={Gradients.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.guestIconWrap}
          >
            <Feather name="user" size={32} color={Colors.white} />
          </LinearGradient>
          <Text style={styles.guestTitle}>尚未登入</Text>
          <Text style={styles.guestDesc}>登入後可儲存分析記錄、查看歷史趨勢</Text>
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryBtnGrad}
          >
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>我的帳號</Text>

        {/* Avatar Card */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={Gradients.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardBanner}
          >
            <View style={styles.bannerDeco1} />
            <View style={styles.bannerDeco2} />
          </LinearGradient>
          <View style={styles.avatarWrap}>
            <LinearGradient
              colors={Gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{user.name[0].toUpperCase()}</Text>
            </LinearGradient>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>
            {user.email}
          </Text>
        </View>

        {/* Info List */}
        <View style={styles.infoList}>
          {infoRows.map((row, i) => (
            <View key={row.label} style={[styles.infoRow, i < infoRows.length - 1 && styles.infoRowBorder]}>
              <View style={styles.infoIconWrap}>
                <Feather name={row.icon} size={14} color={Colors.jade} />
              </View>
              <Text style={styles.infoLabel}>{row.label}</Text>
              <Text style={styles.infoValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Logout */}
        <Pressable style={styles.dangerBtn} onPress={handleLogout}>
          <Feather name="log-out" size={16} color={Colors.redPlaque} />
          <Text style={styles.dangerBtnText}>登出</Text>
        </Pressable>

        <Text style={styles.footer}>DentalVis © 2026 · NCU Dental AI Lab</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: 20, paddingBottom: 52 },

  // Guest
  guestWrap: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginTop: 40,
  },
  guestIconWrap: {
    width: 88, height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    ...Shadows.hero,
  },
  guestTitle: {
    fontFamily: FontFamilies.display, fontSize: 26, color: Colors.ink,
  },
  guestDesc: {
    fontFamily: FontFamilies.body, fontSize: 14, color: Colors.muted,
    textAlign: 'center', lineHeight: 22,
  },
  primaryBtnGrad: {
    width: '100%',
    borderRadius: Radius.xl,
    marginTop: 8,
    ...Shadows.md,
  },
  primaryBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  primaryBtnText: {
    fontFamily: FontFamilies.bodyMed, fontSize: 16, color: Colors.white,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 15,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: Colors.jade,
    justifyContent: 'center',
  },
  outlineBtnText: {
    fontFamily: FontFamilies.bodyMed, fontSize: 16, color: Colors.jade,
  },

  // Logged in
  pageTitle: {
    fontFamily: FontFamilies.heading, fontSize: 32, color: Colors.ink, marginBottom: 24,
  },
  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.jadeAlpha08,
    overflow: 'hidden',
    alignItems: 'center',
    ...Shadows.md,
  },
  cardBanner: {
    width: '100%',
    height: 110,
    overflow: 'hidden',
  },
  bannerDeco1: {
    position: 'absolute',
    width: 160, height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -60, right: -30,
  },
  bannerDeco2: {
    position: 'absolute',
    width: 100, height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -20, left: 20,
  },
  avatarWrap: {
    marginTop: -44,
    borderWidth: 3,
    borderColor: Colors.white,
    borderRadius: 48,
    ...Shadows.md,
  },
  avatar: {
    width: 88, height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamilies.display, fontSize: 38, color: Colors.white,
  },
  userName: {
    fontFamily: FontFamilies.display, fontSize: 26, color: Colors.ink,
    marginTop: 14, marginBottom: 6,
  },
  userEmail: {
    fontFamily: FontFamilies.body, fontSize: 13, color: Colors.muted,
    marginBottom: 40, paddingHorizontal: 28, textAlign: 'center',
    lineHeight: 20,
  },

  infoList: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.jadeAlpha08,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 14,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.jadeAlpha08,
  },
  infoIconWrap: {
    width: 34, height: 34,
    borderRadius: 10,
    backgroundColor: Colors.jadeAlpha08,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontFamily: FontFamilies.body, fontSize: 14, color: Colors.muted, flexShrink: 0,
  },
  infoValue: {
    fontFamily: FontFamilies.bodyMed, fontSize: 13, color: Colors.ink,
    flex: 1, textAlign: 'right',
  },

  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: Colors.redPlaque,
    backgroundColor: 'rgba(192,57,43,0.04)',
    marginBottom: 32,
  },
  dangerBtnText: {
    fontFamily: FontFamilies.bodyMed, fontSize: 16, color: Colors.redPlaque,
  },

  footer: {
    fontFamily: FontFamilies.body, fontSize: 12, color: Colors.linenDark, textAlign: 'center',
  },
});
