import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { getClients, addClient, getAllProgress, setAuthFailureHandler } from '../services/api';
import { showToast } from '../components/Toast';

export default function HomeScreen({ navigation }) {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orgName, setOrgName] = useState('');

  // Derive filtered list from clients + search (no stale state)
  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const query = search.toLowerCase();
    return clients.filter((c) =>
      c.clientName.toLowerCase().includes(query)
    );
  }, [clients, search]);

  // Register auth failure handler to redirect to Login on 401
  useFocusEffect(
    useCallback(() => {
      setAuthFailureHandler(() => navigation.replace('Login'));
      loadData();
      return () => setAuthFailureHandler(null);
    }, [navigation])
  );

  const loadData = async () => {
    try {
      const name = await AsyncStorage.getItem('orgName');
      setOrgName(name || 'Organization');
      await loadClients();
    } catch (error) {
      showToast('Error loading data', 'error');
    }
  };

  const loadClients = async () => {
    try {
      const [clientsRes, progressRes] = await Promise.all([getClients(), getAllProgress()]);
      const deliveredMap = {};
      progressRes.data.forEach(p => {
        const cId = p.clientId?._id || p.clientId;
        if (cId) deliveredMap[cId] = !!p.delivered;
      });
      const merged = clientsRes.data.map(c => ({ ...c, delivered: deliveredMap[c._id] || false }));
      setClients(merged);
    } catch (error) {
      if (error.response?.status === 401) {
        navigation.replace('Login');
      } else {
        showToast('Error loading clients', 'error');
      }
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
      await AsyncStorage.multiRemove(['token', 'orgName']);
      navigation.replace('Login');
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout?')) {
        doLogout();
      }
    } else {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: doLogout },
      ]);
    }
  }, [navigation]);

  const renderClient = useCallback(({ item }) => (
    <TouchableOpacity
      style={styles.clientCard}
      onPress={() => navigation.navigate('Progress', { clientId: item._id, clientName: item.clientName })}
    >
      <View style={styles.clientIcon}>
        <Text style={styles.clientIconText}>🏢</Text>
      </View>
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{item.clientName}</Text>
        <Text style={styles.clientDate}>
          Added {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      {item.delivered && (
        <View style={styles.deliveredBadge}>
          <Text style={styles.deliveredTick}>✓</Text>
        </View>
      )}
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  ), [navigation]);

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
        <View style={styles.headerLeft}>
          <View style={styles.orgIcon}>
            <Text style={styles.orgIconText}>🏢</Text>
          </View>
          <Text style={styles.orgName}>{orgName}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.profileText}>👤</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>⏻</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search clients..."
          placeholderTextColor="#4a4a6a"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.addContainer}>
        <TextInput
          style={styles.addInput}
          placeholder="New client name..."
          placeholderTextColor="#4a4a6a"
          value={newClientName}
          onChangeText={setNewClientName}
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleAddClient}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Clients ({filteredClients.length})</Text>

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
            colors={['#22c55e']}
            tintColor="#22c55e"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No clients found</Text>
            <Text style={styles.emptySubtext}>Add your first client above</Text>
          </View>
        }
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a1a2e',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    borderBottomWidth: 1,
    borderColor: '#2a2a3e',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orgIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orgIconText: {
    fontSize: 22,
  },
  orgName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 20,
    color: '#ef4444',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    fontSize: 20,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  searchInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 15,
    padding: 15,
    fontSize: 16,
    color: '#e2e8f0',
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  addContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 15,
    gap: 10,
  },
  addInput: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 15,
    padding: 15,
    fontSize: 16,
    color: '#e2e8f0',
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  addBtn: {
    width: 54,
    height: 54,
    borderRadius: 15,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 15,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  clientIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientIconText: {
    fontSize: 24,
  },
  clientInfo: {
    flex: 1,
    marginLeft: 15,
  },
  clientName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
  },
  clientDate: {
    fontSize: 13,
    color: '#4a4a6a',
    marginTop: 3,
  },
  deliveredBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  deliveredTick: {
    fontSize: 16,
    color: '#22c55e',
    fontWeight: 'bold',
  },
  arrow: {
    fontSize: 24,
    color: '#4a4a6a',
    fontWeight: '300',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#4a4a6a',
    marginTop: 5,
  },
});
