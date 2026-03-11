import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMe, updateProfile } from '../services/api';
import { showToast } from '../components/Toast';

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await getMe();
      const org = res.data.organization;
      setProfile(org);
      setOrgName(org.organizationName || '');
      setPhone(org.phone || '');
      setAddress(org.address || '');
    } catch (error) {
      showToast('Error loading profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!orgName.trim()) {
      showToast('Organization name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await updateProfile({
        organizationName: orgName.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });
      setProfile(res.data.organization);
      await AsyncStorage.setItem('orgName', res.data.organization.organizationName);
      showToast('Profile updated!', 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Error updating profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.organizationName?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.emailText}>{profile?.email}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Organization Details</Text>

          <Text style={styles.label}>Organization Name</Text>
          <TextInput
            style={styles.input}
            value={orgName}
            onChangeText={setOrgName}
            placeholder="Organization Name"
            placeholderTextColor="#4a4a6a"
          />

          <Text style={styles.label}>Email</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>{profile?.email}</Text>
          </View>

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone number"
            placeholderTextColor="#4a4a6a"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={address}
            onChangeText={setAddress}
            placeholder="Business address"
            placeholderTextColor="#4a4a6a"
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Security</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ChangePassword')}
          >
            <Text style={styles.menuIcon}>🔒</Text>
            <Text style={styles.menuText}>Change Password</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account Info</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <View style={[styles.badge, profile?.isActive ? styles.badgeActive : styles.badgeInactive]}>
              <Text style={profile?.isActive ? styles.badgeActiveText : styles.badgeInactiveText}>
                {profile?.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Joined</Text>
            <Text style={styles.infoValue}>
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '-'}
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: 25,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  emailText: {
    fontSize: 15,
    color: '#64748b',
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 15,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
    marginTop: 10,
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  readOnlyField: {
    backgroundColor: '#0f0f1a',
    borderWidth: 1.5,
    borderColor: '#2a2a3e',
    borderRadius: 12,
    padding: 14,
  },
  readOnlyText: {
    fontSize: 16,
    color: '#4a4a6a',
  },
  saveBtn: {
    backgroundColor: '#22c55e',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#e2e8f0',
    fontWeight: '500',
  },
  menuArrow: {
    fontSize: 22,
    color: '#4a4a6a',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  infoLabel: {
    fontSize: 15,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 15,
    color: '#e2e8f0',
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  badgeInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  badgeActiveText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#22c55e',
  },
  badgeInactiveText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
  },
});
