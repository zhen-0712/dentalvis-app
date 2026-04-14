// ===== 個人資料頁面 =====
import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Radius, Shadows, FontFamilies } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('登出', '確定要登出嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '登出',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.scroll}>
          <Text style={styles.pageTitle}>我的帳號</Text>
          <View style={styles.guestCard}>
            <Text style={styles.guestIcon}>👤</Text>
            <Text style={styles.guestTitle}>尚未登入</Text>
            <Text style={styles.guestDesc}>登入後可儲存分析記錄、查看歷史趨勢</Text>
            <Pressable style={styles.primaryBtn} onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.primaryBtnText}>登入</Text>
            </Pressable>
            <Pressable style={styles.outlineBtn} onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.outlineBtnText}>建立帳號</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.scroll}>
        <Text style={styles.pageTitle}>我的帳號</Text>

        {/* Avatar + Info */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <Text style={styles.userSince}>
            加入於 {new Date(user.created_at).toLocaleDateString('zh-TW')}
          </Text>
        </View>

        {/* Info List */}
        <View style={styles.infoList}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>姓名</Text>
            <Text style={styles.infoValue}>{user.name}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
        </View>

        {/* Actions */}
        <Pressable style={styles.dangerBtn} onPress={handleLogout}>
          <Text style={styles.dangerBtnText}>登出</Text>
        </Pressable>

        <Text style={styles.footer}>DentalVis © 2026 · NCU Dental AI Lab</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { flex: 1, padding: 20 },

  pageTitle: {
    fontFamily: FontFamilies.display,
    fontSize: 32,
    color: Colors.ink,
    marginBottom: 24,
  },

  guestCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.jadeAlpha08,
    ...Shadows.md,
  },
  guestIcon: { fontSize: 48 },
  guestTitle: {
    fontFamily: FontFamilies.display,
    fontSize: 22,
    color: Colors.ink,
  },
  guestDesc: {
    fontFamily: FontFamilies.body,
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },

  primaryBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: Radius.xl,
    backgroundColor: Colors.jade,
    alignItems: 'center',
    marginTop: 8,
    ...Shadows.md,
  },
  primaryBtnText: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 16,
    color: Colors.white,
  },
  outlineBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: Colors.jade,
    alignItems: 'center',
  },
  outlineBtnText: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 16,
    color: Colors.jade,
  },

  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.jadeAlpha08,
    ...Shadows.md,
  },
  avatar: {
    width: 72, height: 72,
    borderRadius: 36,
    backgroundColor: Colors.jade,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontFamily: FontFamilies.display,
    fontSize: 32,
    color: Colors.white,
  },
  userName: {
    fontFamily: FontFamilies.display,
    fontSize: 24,
    color: Colors.ink,
    marginBottom: 4,
  },
  userEmail: {
    fontFamily: FontFamilies.body,
    fontSize: 14,
    color: Colors.muted,
    marginBottom: 4,
  },
  userSince: {
    fontFamily: FontFamilies.body,
    fontSize: 12,
    color: Colors.linenDark,
  },

  infoList: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.jadeAlpha08,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.jadeAlpha08,
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLabel: {
    fontFamily: FontFamilies.body,
    fontSize: 14,
    color: Colors.muted,
  },
  infoValue: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 14,
    color: Colors.ink,
  },

  dangerBtn: {
    paddingVertical: 14,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: Colors.redPlaque,
    alignItems: 'center',
    marginBottom: 32,
  },
  dangerBtnText: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 16,
    color: Colors.redPlaque,
  },

  footer: {
    fontFamily: FontFamilies.body,
    fontSize: 12,
    color: Colors.muted,
    textAlign: 'center',
  },
});
