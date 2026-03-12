import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { getMe, updateProfile } from '../services/api';
import { showToast } from '../components/Toast';
import { useTheme } from '../context/ThemeContext';

export default function ProfileScreen({ navigation }) {
  const t = useTheme();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [newLogo, setNewLogo] = useState(null);

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

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setNewLogo(result.assets[0]);
    }
  };

  const handleSave = async () => {
    if (!orgName.trim()) {
      showToast('Organization name is required', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await updateProfile(
        {
          organizationName: orgName.trim(),
          phone: phone.trim(),
          address: address.trim(),
        },
        newLogo
      );
      const org = res.data.organization;
      setProfile(org);
      setNewLogo(null);
      await AsyncStorage.setItem('orgName', org.organizationName);
      if (org.logo) {
        await AsyncStorage.setItem('orgLogo', org.logo);
        const currentAppLogo = await AsyncStorage.getItem('appLogo');
        if (currentAppLogo) {
          await AsyncStorage.setItem('appLogo', org.logo);
        }
      } else {
        await AsyncStorage.removeItem('orgLogo');
        await AsyncStorage.removeItem('appLogo');
      }
      showToast('Profile updated!', 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Error updating profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    );
  }

  const logoUri = newLogo?.uri || profile?.logo;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { backgroundColor: t.headerBg, borderColor: t.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={[styles.backText, { color: t.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text }]}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickLogo} activeOpacity={0.7}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: t.accent }]}>
                <Text style={styles.avatarText}>
                  {profile?.organizationName?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <View style={[styles.cameraOverlay, { backgroundColor: t.accent }]}>
              <Text style={styles.cameraIcon}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={[styles.emailText, { color: t.textSecondary }]}>{profile?.email}</Text>
          <Text style={[styles.tapHint, { color: t.subText }]}>Tap photo to change logo</Text>
        </View>

        <View style={[styles.card, { backgroundColor: t.cardBg, borderColor: t.border }]}>
          <Text style={[styles.sectionTitle, { color: t.text }]}>Organization Details</Text>

          <Text style={[styles.label, { color: t.textSecondary }]}>Organization Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.text }]}
            value={orgName}
            onChangeText={setOrgName}
            placeholder="Organization Name"
            placeholderTextColor={t.placeholder}
          />

          <Text style={[styles.label, { color: t.textSecondary }]}>Email</Text>
          <View style={[styles.readOnlyField, { backgroundColor: t.inputBg, borderColor: t.inputBorder }]}>
            <Text style={[styles.readOnlyText, { color: t.subText }]}>{profile?.email}</Text>
          </View>

          <Text style={[styles.label, { color: t.textSecondary }]}>Phone</Text>
          <TextInput
            style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.text }]}
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone number"
            placeholderTextColor={t.placeholder}
            keyboardType="phone-pad"
          />

          <Text style={[styles.label, { color: t.textSecondary }]}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.text }]}
            value={address}
            onChangeText={setAddress}
            placeholder="Business address"
            placeholderTextColor={t.placeholder}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: t.accent }]}
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

        <View style={[styles.card, { backgroundColor: t.cardBg, borderColor: t.border }]}>
          <Text style={[styles.sectionTitle, { color: t.text }]}>Security</Text>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ChangePassword')}>
            <Text style={styles.menuIcon}>🔒</Text>
            <Text style={[styles.menuText, { color: t.text }]}>Change Password</Text>
            <Text style={[styles.menuArrow, { color: t.subText }]}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: t.cardBg, borderColor: t.border }]}>
          <Text style={[styles.sectionTitle, { color: t.text }]}>Account Info</Text>
          <View style={[styles.infoRow, { borderBottomColor: t.border }]}>
            <Text style={[styles.infoLabel, { color: t.textSecondary }]}>Status</Text>
            <View style={[styles.badge, profile?.isActive ? { backgroundColor: t.accentLight } : { backgroundColor: t.dangerBg }]}>
              <Text style={profile?.isActive ? [styles.badgeText, { color: t.accent }] : [styles.badgeText, { color: t.danger }]}>
                {profile?.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: t.border }]}>
            <Text style={[styles.infoLabel, { color: t.textSecondary }]}>Joined</Text>
            <Text style={[styles.infoValue, { color: t.text }]}>
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
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  avatarSection: { alignItems: 'center', marginBottom: 25 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 10,
  },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: '#fff' },
  cameraOverlay: {
    position: 'absolute',
    bottom: 8,
    right: -4,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cameraIcon: { fontSize: 14 },
  emailText: { fontSize: 15, marginTop: 4 },
  tapHint: { fontSize: 12, marginTop: 4 },
  card: { borderRadius: 15, padding: 20, marginBottom: 15, borderWidth: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 15 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  readOnlyField: { borderWidth: 1.5, borderRadius: 12, padding: 14 },
  readOnlyText: { fontSize: 16 },
  saveBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  menuIcon: { fontSize: 20, marginRight: 12 },
  menuText: { flex: 1, fontSize: 16, fontWeight: '500' },
  menuArrow: { fontSize: 22 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  infoLabel: { fontSize: 15 },
  infoValue: { fontSize: 15, fontWeight: '500' },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 13, fontWeight: '600' },
});
