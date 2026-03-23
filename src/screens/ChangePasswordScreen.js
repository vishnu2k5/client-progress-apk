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
import { useTheme } from '../context/ThemeContext';

export default function ChangePasswordScreen({ navigation }) {
  const t = useTheme();
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
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { backgroundColor: t.headerBg, borderColor: t.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={[styles.backText, { color: t.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text }]}>Change Password</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={[styles.card, { backgroundColor: t.cardBg, borderColor: t.border }]}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔐</Text>
          </View>
          <Text style={[styles.description, { color: t.textSecondary }]}>
            Enter your current password and choose a new password (minimum 6 characters).
          </Text>

          <Text style={[styles.label, { color: t.textSecondary }]}>Current Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.text }]}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter current password"
            placeholderTextColor={t.placeholder}
            secureTextEntry
          />

          <Text style={[styles.label, { color: t.textSecondary }]}>New Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.text }]}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password"
            placeholderTextColor={t.placeholder}
            secureTextEntry
          />

          <Text style={[styles.label, { color: t.textSecondary }]}>Confirm New Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.text }]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter new password"
            placeholderTextColor={t.placeholder}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: t.accent }]}
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
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 24 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  content: { flex: 1, padding: 20 },
  card: { borderRadius: 15, padding: 25, borderWidth: 1 },
  iconContainer: { alignItems: 'center', marginBottom: 10 },
  icon: { fontSize: 40 },
  description: { fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 16 },
  saveBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 25 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});