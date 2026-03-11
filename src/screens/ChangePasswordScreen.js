import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { changePassword } from '../services/api';
import { showToast } from '../components/Toast';

export default function ChangePasswordScreen({ navigation }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Please fill all fields', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    if (currentPassword === newPassword) {
      showToast('New password must be different from current', 'error');
      return;
    }

    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      showToast('Password changed successfully!', 'success');
      navigation.goBack();
    } catch (error) {
      showToast(error.response?.data?.message || 'Error changing password', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔐</Text>
          </View>
          <Text style={styles.description}>
            Enter your current password and choose a new password (minimum 6 characters).
          </Text>

          <Text style={styles.label}>Current Password</Text>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter current password"
            placeholderTextColor="#4a4a6a"
            secureTextEntry
          />

          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password"
            placeholderTextColor="#4a4a6a"
            secureTextEntry
          />

          <Text style={styles.label}>Confirm New Password</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter new password"
            placeholderTextColor="#4a4a6a"
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleChangePassword}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Update Password</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderColor: '#2a2a3e',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 24,
    color: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 15,
    padding: 25,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  icon: {
    fontSize: 40,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#0f0f1a',
    borderWidth: 1.5,
    borderColor: '#2a2a3e',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#e2e8f0',
  },
  saveBtn: {
    backgroundColor: '#22c55e',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 25,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
