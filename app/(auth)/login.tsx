import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, Shadows, FontFamilies, Gradients } from '../../constants/theme';
import { login } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

export default function LoginScreen() {
  const { refresh } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('請填寫所有欄位'); return; }
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          <Pressable style={styles.closeBtn} onPress={() => router.back()}>
            <Feather name="x" size={18} color={Colors.muted} />
          </Pressable>

          {/* Brand */}
          <LinearGradient
            colors={Gradients.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.brandMark}
          >
            <Feather name="activity" size={22} color={Colors.white} />
          </LinearGradient>
          <Text style={styles.brand}>Smile Guardian</Text>
          <Text style={styles.title}>歡迎回來</Text>
          <Text style={styles.subtitle}>使用您的帳號登入</Text>

          <View style={styles.form}>
            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputWrap}>
                <Feather name="mail" size={16} color={Colors.muted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={Colors.linenDark}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>密碼</Text>
              <View style={styles.inputWrap}>
                <Feather name="lock" size={16} color={Colors.muted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.linenDark}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPw}
                />
                <Pressable onPress={() => setShowPw(v => !v)} style={styles.eyeBtn}>
                  <Feather name={showPw ? 'eye-off' : 'eye'} size={16} color={Colors.muted} />
                </Pressable>
              </View>
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
                  : <>
                      <Feather name="log-in" size={17} color={Colors.white} />
                      <Text style={styles.submitBtnText}>登入</Text>
                    </>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  container: { padding: 24, paddingTop: 64, flexGrow: 1, justifyContent: 'center' },

  closeBtn: {
    position: 'absolute',
    top: 16, right: 24,
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  brandMark: {
    width: 52, height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...Shadows.md,
  },
  brand: {
    fontFamily: FontFamilies.display, fontSize: 18, color: Colors.jade, marginBottom: 28,
  },
  title: {
    fontFamily: FontFamilies.display, fontSize: 34, color: Colors.ink, marginBottom: 8,
  },
  subtitle: {
    fontFamily: FontFamilies.body, fontSize: 15, color: Colors.muted, marginBottom: 34,
  },

  form: { gap: 20 },
  inputGroup: { gap: 8 },
  inputLabel: {
    fontFamily: FontFamilies.bodyMed, fontSize: 13, color: Colors.inkSoft,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.jadeAlpha12,
    paddingHorizontal: 14,
    ...Shadows.sm,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontFamily: FontFamilies.body,
    fontSize: 15,
    color: Colors.ink,
  },
  eyeBtn: { padding: 4 },

  submitBtn: {
    borderRadius: Radius.xl,
    marginTop: 6,
    ...Shadows.hero,
  },
  submitBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 17,
  },
  submitBtnText: {
    fontFamily: FontFamilies.bodyMed, fontSize: 17, color: Colors.white,
  },

  switchWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 32,
  },
  switchText: { fontFamily: FontFamilies.body, fontSize: 14, color: Colors.muted },
  switchLink: { fontFamily: FontFamilies.bodyMed, fontSize: 14, color: Colors.jade },
});
