// ===== 註冊頁面 =====
import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, Shadows, FontFamilies, Gradients } from '../../constants/theme';
import { register } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

export default function RegisterScreen() {
  const { refresh } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('請填寫所有欄位');
      return;
    }
    if (password.length < 6) {
      Alert.alert('密碼至少需要 6 個字元');
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), name.trim(), password);
      await refresh();
      router.back();
    } catch (e: any) {
      Alert.alert('註冊失敗', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Pressable style={styles.closeBtn} onPress={() => router.back()}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>

          <Text style={styles.brand}>Smile Guardian</Text>
          <Text style={styles.title}>建立帳號</Text>
          <Text style={styles.subtitle}>加入 Smile Guardian，開始記錄你的牙齒健康</Text>

          <View style={styles.form}>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>姓名</Text>
              <TextInput
                style={styles.input}
                placeholder="你的名字"
                placeholderTextColor={Colors.muted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={Colors.muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>密碼</Text>
              <TextInput
                style={styles.input}
                placeholder="至少 6 個字元"
                placeholderTextColor={Colors.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <LinearGradient
              colors={Gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitBtn}
            >
              <Pressable style={styles.submitBtnInner} onPress={handleRegister} disabled={loading}>
                {loading
                  ? <ActivityIndicator color={Colors.white} />
                  : <Text style={styles.submitBtnText}>建立帳號</Text>
                }
              </Pressable>
            </LinearGradient>
          </View>

          <View style={styles.switchWrap}>
            <Text style={styles.switchText}>已有帳號？</Text>
            <Pressable onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.switchLink}>登入</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  kav: { flex: 1 },
  container: { padding: 24, paddingTop: 60 },

  closeBtn: {
    position: 'absolute',
    top: 16, right: 24,
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 16, color: Colors.muted },

  brand: {
    fontFamily: FontFamilies.display,
    fontSize: 20,
    color: Colors.jade,
    marginBottom: 32,
  },
  title: {
    fontFamily: FontFamilies.display,
    fontSize: 32,
    color: Colors.ink,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FontFamilies.body,
    fontSize: 15,
    color: Colors.muted,
    marginBottom: 32,
    lineHeight: 22,
  },

  form: { gap: 16 },
  inputWrap: { gap: 6 },
  inputLabel: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 13,
    color: Colors.inkSoft,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.jadeAlpha12,
    padding: 14,
    fontFamily: FontFamilies.body,
    fontSize: 16,
    color: Colors.ink,
    ...Shadows.sm,
  },

  submitBtn: {
    borderRadius: Radius.xl,
    marginTop: 8,
    ...Shadows.md,
  },
  submitBtnInner: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnText: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 17,
    color: Colors.white,
  },

  switchWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
  },
  switchText: {
    fontFamily: FontFamilies.body,
    fontSize: 14,
    color: Colors.muted,
  },
  switchLink: {
    fontFamily: FontFamilies.bodyMed,
    fontSize: 14,
    color: Colors.jade,
  },
});
