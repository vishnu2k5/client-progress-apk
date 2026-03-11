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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login, register } from '../services/api';
import { showToast } from '../components/Toast';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        navigation.replace('Home');
      }
    } catch {
      // token check failed, stay on login
    }
  }, [navigation]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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
        navigation.replace('Home');
      } else {
        if (!organizationName.trim()) {
          showToast('Organization name is required', 'error');
          return;
        }
        if (!phone.trim()) {
          showToast('Phone number is required', 'error');
          return;
        }
        if (!address.trim()) {
          showToast('Address is required', 'error');
          return;
        }
        await register({
          organizationName: organizationName.trim(),
          email: email.trim(),
          password,
          phone: phone.trim(),
          address: address.trim(),
        });
        showToast('Registration successful! Please login.');
        setIsLogin(true);
        setPassword('');
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>📊</Text>
          <Text style={styles.title}>Smarta Tech</Text>
          <Text style={styles.subtitle}>Tracker</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, isLogin && styles.activeTab]}
              onPress={() => setIsLogin(true)}
            >
              <Text style={[styles.tabText, isLogin && styles.activeTabText]}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, !isLogin && styles.activeTab]}
              onPress={() => setIsLogin(false)}
            >
              <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>Register</Text>
            </TouchableOpacity>
          </View>

          {!isLogin && (
            <TextInput
              style={styles.input}
              placeholder="e.g. Smarta Technologies"
              placeholderTextColor="#94a3b8"
              value={organizationName}
              onChangeText={setOrganizationName}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="e.g. info@smartatech.com"
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="e.g. Min 6 characters"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {!isLogin && (
            <TextInput
              style={styles.input}
              placeholder="e.g. +91 98765 43210"
              placeholderTextColor="#94a3b8"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          )}

          {!isLogin && (
            <TextInput
              style={styles.input}
              placeholder="e.g. 2/367, Society Colony, 1st Main 5th Cross, near Ramalayam"
              placeholderTextColor="#94a3b8"
              value={address}
              onChangeText={setAddress}
            />
          )}

          <TouchableOpacity
            style={styles.submitBtn}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 24,
    color: '#22c55e',
    fontWeight: '600',
  },
  form: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 25,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 25,
    backgroundColor: '#0f0f1a',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#22c55e',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#0f0f1a',
    borderWidth: 1,
    borderColor: '#2a2a3e',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    color: '#e2e8f0',
  },
  submitBtn: {
    backgroundColor: '#22c55e',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
