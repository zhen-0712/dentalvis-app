// ===== 登入頁面 =====
import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, Shadows, FontFamilies, Gradients } from '../../constants/theme';
import { login } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

export default function LoginScreen() {
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('請填寫所有欄位');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      await refresh();
      router.back();
    } catch (e: any) {
      Alert.alert('登入失敗', e.message);
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
        <View style={styles.container}>
          {/* Header */}
          <Pressable style={styles.closeBtn} onPress={() => router.back()}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>

          <Text style={styles.brand}>DentalVis</Text>
          <Text style={styles.title}>登入帳號</Text>
          <Text style={styles.subtitle}>使用您的 Email 登入</Text>

          {/* Form */}
          <View style={styles.form}>
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
                placeholder="••••••••"
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
              <Pressable style={styles.submitBtnInner} onPress={handleLogin} disabled={loading}>
                {loading
                  ? <ActivityIndicator color={Colors.white} />
                  : <Text style={styles.submitBtnText}>登入</Text>
                }
              </Pressable>
            </LinearGradient>
          </View>

          <View style={styles.switchWrap}>
            <Text style={styles.switchText}>還沒有帳號？</Text>
            <Pressable onPress={() => router.replace('/(auth)/register')}>
              <Text style={styles.switchLink}>立即註冊</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  kav: { flex: 1 },
  container: { flex: 1, padding: 24, justifyContent: 'center' },

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
