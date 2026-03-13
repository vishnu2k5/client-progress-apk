import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { login, register } from '../services/api';
import { showToast } from '../components/Toast';
import { useTheme } from '../context/ThemeContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation }) {
  const t = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logo, setLogo] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) navigation.replace('Home');
    } catch {}
  }, [navigation]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setLogo(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      showToast('Please enter a valid email', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const res = await login(email.trim(), password);
        await AsyncStorage.setItem('token', res.data.token);
        await AsyncStorage.setItem('orgName', res.data.organization.organizationName);
        const orgLogo = res.data.organization.logo;
        if (orgLogo) {
          await AsyncStorage.setItem('orgLogo', orgLogo);
        }
        navigation.replace('Home');
      } else {
        if (!organizationName.trim()) { showToast('Organization name is required', 'error'); setLoading(false); return; }
        if (!phone.trim()) { showToast('Phone number is required', 'error'); setLoading(false); return; }
        if (!address.trim()) { showToast('Address is required', 'error'); setLoading(false); return; }
        const res = await register(
          {
            organizationName: organizationName.trim(),
            email: email.trim(),
            password,
            phone: phone.trim(),
            address: address.trim(),
          },
          logo
        );
        showToast('Registration successful! Please login.');
        setIsLogin(true);
        setPassword('');
        setLogo(null);
      }
    } catch (error) {
      const message = error.response?.data?.message
        || (error.code === 'ECONNABORTED' ? 'Request timed out' : 'Something went wrong');
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.logo}>📊</Text>
            <Text style={[styles.title, { color: t.text }]}>Smarta Tech</Text>
            <Text style={[styles.subtitle, { color: t.accent }]}>Tracker</Text>
          </View>

          <View style={[styles.form, { backgroundColor: t.cardBg, borderColor: t.border }]}>
            <View style={[styles.tabContainer, { backgroundColor: t.tabBg }]}>
              <TouchableOpacity
                style={[styles.tab, isLogin && [styles.activeTab, { backgroundColor: t.accent }]]}
                onPress={() => setIsLogin(true)}
              >
                <Text style={[styles.tabText, { color: t.textSecondary }, isLogin && styles.activeTabText]}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, !isLogin && [styles.activeTab, { backgroundColor: t.accent }]]}
                onPress={() => setIsLogin(false)}
              >
                <Text style={[styles.tabText, { color: t.textSecondary }, !isLogin && styles.activeTabText]}>Register</Text>
              </TouchableOpacity>
            </View>

            {!isLogin && (
              <>
                <Text style={[styles.label, { color: t.textSecondary }]}>Organization Logo</Text>
                <TouchableOpacity
                  style={[styles.logoPicker, { backgroundColor: t.inputBg, borderColor: t.inputBorder }]}
                  onPress={pickLogo}
                >
                  {logo ? (
                    <Image source={{ uri: logo.uri }} style={styles.logoPreview} />
                  ) : (
                    <View style={styles.logoPlaceholder}>
                      <Text style={styles.logoPlaceholderIcon}>📷</Text>
                      <Text style={[styles.logoPlaceholderText, { color: t.placeholder }]}>
                        Tap to add logo
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </>
            )}

            {!isLogin && (
              <>
                <Text style={[styles.label, { color: t.textSecondary }]}>Organization Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.text }]}
                  placeholder="e.g. Smarta Technologies"
                  placeholderTextColor={t.placeholder}
                  value={organizationName}
                  onChangeText={setOrganizationName}
                />
              </>
            )}

            <Text style={[styles.label, { color: t.textSecondary }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.text }]}
              placeholder="e.g. info@smartatech.com"
              placeholderTextColor={t.placeholder}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[styles.label, { color: t.textSecondary }]}>Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.text }]}
              placeholder="e.g. Min 6 characters"
              placeholderTextColor={t.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {!isLogin && (
              <>
                <Text style={[styles.label, { color: t.textSecondary }]}>Phone</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.text }]}
                  placeholder="e.g. +91 98765 43210"
                  placeholderTextColor={t.placeholder}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </>
            )}

            {!isLogin && (
              <>
                <Text style={[styles.label, { color: t.textSecondary }]}>Address</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.text }]}
                  placeholder="e.g. 2/367, Society Colony..."
                  placeholderTextColor={t.placeholder}
                  value={address}
                  onChangeText={setAddress}
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: t.accent }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>{isLogin ? 'Login' : 'Register'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 60, marginBottom: 10 },
  title: { fontSize: 28, fontWeight: 'bold' },
  subtitle: { fontSize: 24, fontWeight: '600' },
  form: { borderRadius: 20, padding: 25, borderWidth: 1 },
  tabContainer: { flexDirection: 'row', marginBottom: 25, borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  activeTab: {},
  tabText: { fontSize: 16, fontWeight: '600' },
  activeTabText: { color: '#fff' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  logoPicker: {
    width: 100,
    height: 100,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignSelf: 'center',
    marginBottom: 18,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPreview: { width: 100, height: 100, borderRadius: 20 },
  logoPlaceholder: { alignItems: 'center' },
  logoPlaceholderIcon: { fontSize: 28, marginBottom: 4 },
  logoPlaceholderText: { fontSize: 11, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 12, padding: 15, fontSize: 16, marginBottom: 15 },
  submitBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
