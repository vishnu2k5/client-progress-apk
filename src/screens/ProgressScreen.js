import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProgress, updateProgress, deleteClient, updateClient } from '../services/api';
import { showToast } from '../components/Toast';

const STAGES = [
  { key: 'Lead', label: 'Lead' },
  { key: 'firstContact', label: 'First Contact' },
  { key: 'followUp', label: 'Follow Up' },
  { key: 'RFQ', label: 'RFQ' },
  { key: 'quote', label: 'Quote' },
  { key: 'quoteFollowUp', label: 'Quote Follow Up' },
  { key: 'order', label: 'Order', isOrder: true },
];

export default function ProgressScreen({ route, navigation }) {
  const { clientId, clientName: initialName } = route.params;
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [inputs, setInputs] = useState({});
  const [editingName, setEditingName] = useState(false);
  const [clientNameInput, setClientNameInput] = useState(initialName);
  const [currentName, setCurrentName] = useState(initialName);
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const res = await getProgress(clientId);
      const data = res.data[0] || {};
      setProgress(data);
      
      // Initialize inputs with current values
      const initialInputs = {};
      STAGES.forEach(stage => {
        const stageData = data[stage.key] || {};
        initialInputs[`${stage.key}-assignee`] = stageData.assignee || '';
        if (stage.isOrder) {
          initialInputs[`${stage.key}-value`] = stageData.value?.toString() || '';
        } else {
          initialInputs[`${stage.key}-date`] = stageData.date || '';
        }
      });
      setInputs(initialInputs);
    } catch (error) {
      showToast('Error loading progress', 'error');
    }
    setLoading(false);
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const handleSave = async (stageKey, isOrder) => {
    setSaving(stageKey);
    try {
      const assignee = inputs[`${stageKey}-assignee`] || null;
      let stageData = { assignee };
      
      if (isOrder) {
        const value = inputs[`${stageKey}-value`];
        stageData.value = value ? Number(value) : null;
      } else {
        const date = inputs[`${stageKey}-date`];
        stageData.date = date || getTodayDate();
        // Update input to show the date
        setInputs(prev => ({ ...prev, [`${stageKey}-date`]: stageData.date }));
      }
      
      await updateProgress(clientId, { [stageKey]: stageData });
      setProgress(prev => ({ ...prev, [stageKey]: stageData }));
      showToast('Saved!', 'success');
    } catch (error) {
      showToast('Error saving', 'error');
    }
    setSaving(null);
  };

  const handleToggleDelivered = async () => {
    const newStatus = !progress.delivered;
    try {
      await updateProgress(clientId, { delivered: newStatus });
      setProgress(prev => ({ ...prev, delivered: newStatus }));
      showToast(newStatus ? 'Marked as Delivered!' : 'Marked as Pending', 'success');
    } catch (error) {
      showToast('Error updating status', 'error');
    }
  };

  const handleEditName = async () => {
    if (!clientNameInput.trim()) {
      showToast('Client name cannot be empty', 'error');
      return;
    }
    if (clientNameInput.trim() === currentName) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      await updateClient(clientId, clientNameInput.trim());
      setCurrentName(clientNameInput.trim());
      setEditingName(false);
      showToast('Client name updated!', 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Error updating name', 'error');
    } finally {
      setSavingName(false);
    }
  };

  const handleDelete = () => {
    const doDelete = async () => {
      try {
        await deleteClient(clientId);
        showToast('Client deleted', 'success');
        navigation.goBack();
      } catch (error) {
        showToast('Error deleting client', 'error');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Delete Client',
        'Are you sure you want to delete this client? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const updateInput = (key, value) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const hasValue = (stageKey, isOrder) => {
    const stageData = progress[stageKey];
    if (!stageData) return false;
    if (isOrder) return !!(stageData.assignee || stageData.value);
    return !!(stageData.assignee || stageData.date);
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
        <Text style={styles.headerTitle}>Client Progress</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.clientCard}>
          <View style={styles.clientIcon}>
            <Text style={styles.clientIconText}>🏢</Text>
          </View>
          <View style={styles.clientInfo}>
            <Text style={styles.clientLabel}>CLIENT PROGRESS</Text>
            {editingName ? (
              <View style={styles.editNameRow}>
                <TextInput
                  style={styles.editNameInput}
                  value={clientNameInput}
                  onChangeText={setClientNameInput}
                  autoFocus
                />
                <TouchableOpacity style={styles.editNameSave} onPress={handleEditName} disabled={savingName}>
                  {savingName ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.editNameSaveText}>✓</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editNameCancel}
                  onPress={() => { setEditingName(false); setClientNameInput(currentName); }}
                >
                  <Text style={styles.editNameCancelText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditingName(true)} style={styles.nameRow}>
                <Text style={styles.clientName}>{currentName}</Text>
                <Text style={styles.editIcon}>✏️</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.pipeline}>
          <View style={styles.pipelineLine} />
          
          {STAGES.map((stage, index) => {
            const hasVal = hasValue(stage.key, stage.isOrder);
            const isActive = index === 0 || hasVal;
            
            return (
              <View key={stage.key} style={styles.stageItem}>
                <View style={[
                  styles.stageDot,
                  hasVal && styles.stageDotCompleted,
                  !hasVal && isActive && styles.stageDotActive,
                ]}>
                  {hasVal && <View style={styles.stageDotInner} />}
                </View>
                
                <View style={styles.stageContent}>
                  <Text style={[
                    styles.stageLabel,
                    hasVal && styles.stageLabelCompleted,
                    !hasVal && isActive && styles.stageLabelActive,
                  ]}>
                    {stage.label}
                  </Text>
                  
                  <View style={styles.inputRow}>
                    <TextInput
                      style={[
                        styles.input,
                        inputs[`${stage.key}-assignee`] && styles.inputHasValue,
                        hasVal && styles.inputDisabled,
                      ]}
                      placeholder="Assign to..."
                      placeholderTextColor="#4a4a6a"
                      value={inputs[`${stage.key}-assignee`]}
                      onChangeText={(val) => updateInput(`${stage.key}-assignee`, val)}
                      editable={!hasVal}
                    />
                    {!hasVal && (
                      <TouchableOpacity
                        style={styles.saveBtn}
                        onPress={() => handleSave(stage.key, stage.isOrder)}
                        disabled={saving === stage.key}
                      >
                        {saving === stage.key ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.saveBtnText}>➤</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <View style={styles.inputRow}>
                    {stage.isOrder ? (
                      <TextInput
                        style={[
                          styles.input,
                          inputs[`${stage.key}-value`] && styles.inputHasValue,
                          hasVal && styles.inputDisabled,
                        ]}
                        placeholder="Order Value"
                        placeholderTextColor="#4a4a6a"
                        value={inputs[`${stage.key}-value`]}
                        onChangeText={(val) => updateInput(`${stage.key}-value`, val)}
                        keyboardType="numeric"
                        editable={!hasVal}
                      />
                    ) : (
                      <TextInput
                        style={[
                          styles.input,
                          inputs[`${stage.key}-date`] && styles.inputHasValue,
                          hasVal && styles.inputDisabled,
                        ]}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#4a4a6a"
                        value={inputs[`${stage.key}-date`]}
                        onChangeText={(val) => updateInput(`${stage.key}-date`, val)}
                        editable={!hasVal}
                      />
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>🗑️ Delete Client</Text>
        </TouchableOpacity>
        
        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.deliverBtn,
          progress.delivered ? styles.deliverBtnDelivered : styles.deliverBtnPending,
        ]}
        onPress={handleToggleDelivered}
        disabled={progress.delivered}
      >
        <Text style={styles.deliverBtnText}>
          {progress.delivered ? '✓ Delivered' : '📦 Mark as Delivered'}
        </Text>
      </TouchableOpacity>
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
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  clientIcon: {
    width: 55,
    height: 55,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientIconText: {
    fontSize: 28,
  },
  clientInfo: {
    marginLeft: 15,
    flex: 1,
  },
  clientLabel: {
    fontSize: 11,
    color: '#4a4a6a',
    letterSpacing: 1,
  },
  clientName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  editIcon: {
    fontSize: 14,
    marginLeft: 8,
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 6,
  },
  editNameInput: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    borderWidth: 2,
    borderColor: '#22c55e',
    borderRadius: 10,
    padding: 8,
    fontSize: 16,
    color: '#e2e8f0',
  },
  editNameSave: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editNameSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  editNameCancel: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editNameCancelText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  pipeline: {
    paddingLeft: 30,
    position: 'relative',
  },
  pipelineLine: {
    position: 'absolute',
    left: 8,
    top: 20,
    bottom: 20,
    width: 2,
    backgroundColor: '#2a2a3e',
  },
  stageItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stageDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1a1a2e',
    borderWidth: 2,
    borderColor: '#2a2a3e',
    position: 'absolute',
    left: -24,
    top: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageDotActive: {
    borderColor: '#22c55e',
    backgroundColor: '#22c55e',
  },
  stageDotCompleted: {
    borderColor: '#22c55e',
    backgroundColor: '#22c55e',
  },
  stageDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  stageContent: {
    flex: 1,
  },
  stageLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4a4a6a',
    marginBottom: 10,
  },
  stageLabelActive: {
    color: '#22c55e',
  },
  stageLabelCompleted: {
    color: '#22c55e',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    borderWidth: 1.5,
    borderColor: '#2a2a3e',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#e2e8f0',
  },
  inputHasValue: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  inputDisabled: {
    opacity: 0.7,
  },
  saveBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnCompleted: {
    backgroundColor: '#16a34a',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  deleteBtnText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  deliverBtn: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    padding: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  deliverBtnPending: {
    backgroundColor: '#f97316',
  },
  deliverBtnDelivered: {
    backgroundColor: '#22c55e',
  },
  deliverBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
