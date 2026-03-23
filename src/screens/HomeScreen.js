import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  getClients,
  addClient,
  getAllProgress,
  setAuthFailureHandler,
  getMe,
  registerNotificationDevice,
  unregisterNotificationDevice,
} from '../services/api';
import { showToast } from '../components/Toast';
import { useTheme } from '../context/ThemeContext';
import { getLastUpdateInfo, formatDaysAgo, getNotificationStyle } from '../services/notificationService';
import {
  notifyStaleProgress,
  getExpoPushToken,
  getStoredExpoPushToken,
  clearStoredExpoPushToken,
} from '../services/localNotifications';

export default function HomeScreen({ navigation }) {
  const t = useTheme();
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgLogo, setOrgLogo] = useState(null);

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const query = search.toLowerCase();
    return clients.filter((c) => c.clientName.toLowerCase().includes(query));
  }, [clients, search]);

  useFocusEffect(
    useCallback(() => {
      setAuthFailureHandler(() => navigation.replace('Login'));
      loadData();
      return () => setAuthFailureHandler(null);
    }, [navigation])
  );

  const loadData = async () => {
    try {
      const [name, logo, appLogo] = await Promise.all([
        AsyncStorage.getItem('orgName'),
        AsyncStorage.getItem('orgLogo'),
        AsyncStorage.getItem('appLogo'),
      ]);
      setOrgName(name || 'Organization');
      setOrgLogo(logo || appLogo || null);

      // Refresh org info from server (logo may have changed on profile)
      try {
        const meRes = await getMe();
        const org = meRes.data.organization;
        if (org.organizationName) {
          setOrgName(org.organizationName);
          await AsyncStorage.setItem('orgName', org.organizationName);
        }
        if (org.logo) {
          setOrgLogo(org.logo);
          await AsyncStorage.setItem('orgLogo', org.logo);
        } else {
          // Fall back to appLogo if user explicitly set one via the login prompt
          const savedAppLogo = await AsyncStorage.getItem('appLogo');
          if (savedAppLogo) {
            setOrgLogo(savedAppLogo);
          } else {
            setOrgLogo(null);
            await AsyncStorage.removeItem('orgLogo');
          }
        }
      } catch {}

      await loadClients();
      await syncNotificationRegistration();
    } catch (error) {
      showToast('Error loading data', 'error');
    }
  };

  const syncNotificationRegistration = async () => {
    try {
      const expoPushToken = await getExpoPushToken();
      if (!expoPushToken) return;
      await registerNotificationDevice(Platform.OS, expoPushToken);
    } catch {
      // Keep app usable even if push registration fails.
    }
  };

  const loadClients = async () => {
    try {
      const [clientsRes, progressRes] = await Promise.all([getClients(), getAllProgress()]);
      const deliveredMap = {};
      const updateInfoMap = {};
      progressRes.data.forEach((p) => {
        const cId = p.clientId?._id || p.clientId;
        if (cId) {
          deliveredMap[cId] = !!p.delivered;
          updateInfoMap[cId] = getLastUpdateInfo(p);
        }
      });
      const merged = clientsRes.data.map((c) => ({
        ...c,
        delivered: deliveredMap[c._id] || false,
        updateInfo: updateInfoMap[c._id] || { lastUpdateDate: null, daysAgo: Infinity, isOverdue: true },
      }));
      setClients(merged);

      const staleCount = merged.filter((client) => !client.delivered && client.updateInfo.isOverdue).length;
      if (staleCount > 0) {
        await notifyStaleProgress(staleCount);
      }
    } catch (error) {
      if (error.response?.status === 401) navigation.replace('Login');
      else showToast('Error loading clients', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddClient = useCallback(async () => {
    if (!newClientName.trim()) {
      showToast('Please enter client name', 'error');
      return;
    }
    try {
      await addClient(newClientName.trim());
      setNewClientName('');
      await loadClients();
      showToast('Client added!', 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Error adding client', 'error');
    }
  }, [newClientName]);

  const handleLogout = useCallback(() => {
    const doLogout = async () => {
      try {
        const storedToken = await getStoredExpoPushToken();
        if (storedToken) {
          await unregisterNotificationDevice(storedToken);
        }
      } catch {
      } finally {
        await clearStoredExpoPushToken();
      }
      await AsyncStorage.multiRemove(['token', 'orgName', 'orgLogo']);
      navigation.replace('Login');
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout?')) doLogout();
    } else {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: doLogout },
      ]);
    }
  }, [navigation]);

  const renderClient = useCallback(
    ({ item }) => {
      const showReminder = !item.delivered && item.updateInfo.isOverdue;
      const notifStyle = getNotificationStyle(showReminder);
      return (
        <TouchableOpacity
          style={[
            styles.clientCard,
            {
              backgroundColor: t.cardBg,
              borderColor: showReminder ? notifStyle.color : t.border,
              borderWidth: showReminder ? 2 : 1,
            },
          ]}
          onPress={() => navigation.navigate('Progress', { clientId: item._id, clientName: item.clientName })}
        >
          <View style={[styles.clientIcon, { backgroundColor: t.accentLight }]}>
            <Text style={styles.clientIconText}>🏢</Text>
          </View>
          <View style={styles.clientInfo}>
            <Text style={[styles.clientName, { color: t.text }]}>{item.clientName}</Text>
            <Text style={[styles.clientDate, showReminder ? { color: notifStyle.color } : { color: t.subText }]}>
              {formatDaysAgo(item.updateInfo.daysAgo)}
            </Text>
            {showReminder && (
              <View style={[styles.notificationBadge, { backgroundColor: notifStyle.bgColor }]}>
                <Text style={[styles.notificationText, { color: notifStyle.color }]}>⚠ {notifStyle.text}</Text>
              </View>
            )}
          </View>
          {item.delivered && (
            <View style={[styles.deliveredBadge, { backgroundColor: t.accentLight }]}>
              <Text style={[styles.deliveredTick, { color: t.accent }]}>✓</Text>
            </View>
          )}
          <Text style={[styles.arrow, { color: t.subText }]}>›</Text>
        </TouchableOpacity>
      );
    },
    [navigation, t]
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { backgroundColor: t.headerBg, borderColor: t.border }]}>
        <View style={styles.headerLeft}>
          {orgLogo ? (
            <Image source={{ uri: orgLogo }} style={styles.orgLogoImage} />
          ) : (
            <View style={[styles.orgIcon, { backgroundColor: t.accentLight }]}>
              <Text style={styles.orgIconText}>🏢</Text>
            </View>
          )}
          <Text style={[styles.orgName, { color: t.text }]}>{orgName}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.profileBtn, { backgroundColor: t.accentLight }]} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.profileText}>👤</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: t.dangerBg }]} onPress={handleLogout}>
            <MaterialIcons name="logout" size={22} color={t.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: t.cardBg, color: t.text, borderColor: t.border }]}
          placeholder="🔍 Search clients..."
          placeholderTextColor={t.subText}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.addContainer}>
        <TextInput
          style={[styles.addInput, { backgroundColor: t.cardBg, color: t.text, borderColor: t.border }]}
          placeholder="New client name..."
          placeholderTextColor={t.subText}
          value={newClientName}
          onChangeText={setNewClientName}
        />
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: t.accent }]} onPress={handleAddClient}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: t.text }]}>Clients ({filteredClients.length})</Text>

      <FlatList
        data={filteredClients}
        keyExtractor={(item) => item._id}
        renderItem={renderClient}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadClients();
            }}
            colors={[t.accent]}
            tintColor={t.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: t.textSecondary }]}>No clients found</Text>
            <Text style={[styles.emptySubtext, { color: t.subText }]}>Add your first client above</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orgIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  orgIconText: { fontSize: 22 },
  orgLogoImage: { width: 42, height: 42, borderRadius: 12 },
  orgName: { fontSize: 20, fontWeight: 'bold' },
  logoutBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerActions: { flexDirection: 'row', gap: 10 },
  profileBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  profileText: { fontSize: 20 },
  searchContainer: { paddingHorizontal: 20, paddingTop: 20 },
  searchInput: { borderRadius: 15, padding: 15, fontSize: 16, borderWidth: 1 },
  addContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 15, gap: 10 },
  addInput: { flex: 1, borderRadius: 15, padding: 15, fontSize: 16, borderWidth: 1 },
  addBtn: { width: 54, height: 54, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  addBtnText: { fontSize: 28, color: '#fff', fontWeight: '300' },
  sectionTitle: { fontSize: 18, fontWeight: '600', paddingHorizontal: 20, paddingTop: 25, paddingBottom: 15 },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  clientCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 15, padding: 15, marginBottom: 12, borderWidth: 1 },
  clientIcon: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  clientIconText: { fontSize: 24 },
  clientInfo: { flex: 1, marginLeft: 15 },
  clientName: { fontSize: 17, fontWeight: '600' },
  clientDate: { fontSize: 13, marginTop: 3 },
  notificationBadge: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start' },
  notificationText: { fontSize: 11, fontWeight: '600' },
  deliveredBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  deliveredTick: { fontSize: 16, fontWeight: 'bold' },
  arrow: { fontSize: 24, fontWeight: '300' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 18, fontWeight: '600' },
  emptySubtext: { fontSize: 14, marginTop: 5 },
});
