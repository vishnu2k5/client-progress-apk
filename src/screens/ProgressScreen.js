import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProgress, updateProgress, deleteClient, updateClient } from '../services/api';
import { showToast } from '../components/Toast';
import { useTheme } from '../context/ThemeContext';

const STAGES = [
  { key: 'Lead', label: 'Lead' },
  { key: 'firstContact', label: 'First Contact' },
  { key: 'followUp', label: 'Follow Up' },
  { key: 'RFQ', label: 'RFQ' },
  { key: 'quote', label: 'Quote' },
  { key: 'quoteFollowUp', label: 'Quote Follow Up' },
  { key: 'order', label: 'Order', isOrder: true },
];

const LABEL_W = 105;
const DOT_W = 40;

export default function ProgressScreen({ route, navigation }) {
  const t = useTheme();
  const { clientId, clientName: initialName } = route.params;
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [delivering, setDelivering] = useState(false); // FIX #2: dedicated loading state
  const [inputs, setInputs] = useState({});
  const [editingName, setEditingName] = useState(false);
  const [clientNameInput, setClientNameInput] = useState(initialName);
  const [currentName, setCurrentName] = useState(initialName);
  const [savingName, setSavingName] = useState(false);
  const [openDateStage, setOpenDateStage] = useState(null);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    // FIX #6: always show loading indicator when fetching
    setLoading(true);
    try {
      const res = await getProgress(clientId);
      const data = res.data[0] || {};
      setProgress(data);
      const init = {};
      STAGES.forEach((s) => {
        const d = data[s.key] || {};
        init[`${s.key}-assignee`] = d.assignee || '';
        if (s.isOrder) init[`${s.key}-value`] = d.value?.toString() || '';
        else init[`${s.key}-date`] = d.date || '';
      });
      setInputs(init);
    } catch (error) {
      showToast('Error loading progress', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getTodayDate = () => formatDate(new Date());

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  const parseDate = (value) => {
    if (!value) return new Date();
    const normalized = value.replace(/\//g, '-');
    const parsed = new Date(`${normalized}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  const toWebInputDate = (value) => {
    if (!value) return '';
    return value.replace(/\//g, '-');
  };

  const fromWebInputDate = (value) => {
    if (!value) return '';
    return value.replace(/-/g, '/');
  };

  // FIX #12: useCallback so handleSave is stable when inputs/clientId don't change
  const handleSave = useCallback(async (stageKey, isOrder) => {
    setSaving(stageKey);
    try {
      const assignee = inputs[`${stageKey}-assignee`] || null;
      let stageData = { assignee };
      if (isOrder) {
        // FIX #16: validate order value is a valid number
        const raw = inputs[`${stageKey}-value`]?.trim();
        const parsed = raw ? parseFloat(raw) : null;
        if (raw && isNaN(parsed)) {
          showToast('Order value must be a number', 'error');
          setSaving(null);
          return;
        }
        stageData.value = parsed;
      } else {
        const d = inputs[`${stageKey}-date`];
        stageData.date = d || getTodayDate();
        setInputs((prev) => ({ ...prev, [`${stageKey}-date`]: stageData.date }));
      }
      await updateProgress(clientId, { [stageKey]: stageData });
      setProgress((prev) => ({ ...prev, [stageKey]: stageData }));
      showToast('Saved!', 'success');
    } catch (error) {
      showToast('Error saving', 'error');
    } finally {
      setSaving(null);
    }
  }, [inputs, clientId]);

  // FIX #2: Deliver button is now a proper toggle with loading state
  // It is never permanently disabled — user can un-deliver at any time
  const handleToggleDelivered = async () => {
    const newStatus = !progress.delivered;
    setDelivering(true);
    try {
      await updateProgress(clientId, { delivered: newStatus });
      setProgress((prev) => ({ ...prev, delivered: newStatus }));
      showToast(newStatus ? 'Marked as Delivered!' : 'Marked as Pending', 'success');
    } catch (error) {
      showToast('Error updating status', 'error');
    } finally {
      setDelivering(false);
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
      if (window.confirm('Delete this client? This action cannot be undone.')) doDelete();
    } else {
      Alert.alert('Delete Client', 'Delete this client? This action cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const updateInput = (key, value) => setInputs((prev) => ({ ...prev, [key]: value }));

  const handleDateChange = (stageKey, event, selectedDate) => {
    if (Platform.OS === 'android') setOpenDateStage(null);
    if (event?.type === 'dismissed' || !selectedDate) return;
    updateInput(`${stageKey}-date`, formatDate(selectedDate));
  };

  const hasValue = (stageKey, isOrder) => {
    const d = progress[stageKey];
    if (!d) return false;
    return isOrder ? !!(d.assignee || d.value) : !!(d.assignee || d.date);
  };

  // FIX #9: useMemo so this only recalculates when progress changes
  const firstIncomplete = useMemo(
    () => STAGES.findIndex((s) => !hasValue(s.key, s.isOrder)),
    [progress]
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" color={t.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: t.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomColor: t.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={[styles.backText, { color: t.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text }]}>Client Progress</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.flex1}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Client Card */}
        <View style={[styles.clientCard, { backgroundColor: t.cardBg, borderColor: t.border }]}>
          <View style={[styles.clientIcon, { backgroundColor: t.iconBg }]}>
            <Text style={styles.clientIconText}>🏢</Text>
          </View>
          <View style={styles.clientInfo}>
            <Text style={[styles.clientLabel, { color: t.subText }]}>CLIENT PROGRESS</Text>
            {editingName ? (
              <View style={styles.editNameRow}>
                <TextInput
                  style={[styles.editNameInput, { backgroundColor: t.inputBg, borderColor: t.primary, color: t.text }]}
                  value={clientNameInput}
                  onChangeText={setClientNameInput}
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.editNameSave, { backgroundColor: t.primary }]}
                  onPress={handleEditName}
                  disabled={savingName}
                >
                  {savingName ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.editNameSaveText}>✓</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editNameCancel, { backgroundColor: t.dangerBg }]}
                  onPress={() => { setEditingName(false); setClientNameInput(currentName); }}
                >
                  <Text style={[styles.editNameCancelText, { color: t.danger }]}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditingName(true)} style={styles.nameRow}>
                <Text style={[styles.clientName, { color: t.text }]}>{currentName}</Text>
                <Text style={styles.editIcon}>✏️</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Pipeline */}
        <View style={styles.pipeline}>
          <View style={[styles.pipelineLine, { backgroundColor: t.line }]} />

          {STAGES.map((stage, index) => {
            const hasVal = hasValue(stage.key, stage.isOrder);
            const isActive = index === firstIncomplete;

            const dotBorderColor = hasVal ? t.accent : isActive ? t.primary : t.dotBorder;
            const dotBgColor = hasVal ? t.accent : isActive ? t.primary : t.dotBg;
            const labelColor = hasVal ? t.accent : isActive ? t.primary : t.subText;

            return (
              <View key={stage.key} style={styles.stageRow}>
                {/* Label */}
                <View style={styles.labelWrap}>
                  <Text style={[styles.stageLabel, { color: labelColor }]} numberOfLines={2}>
                    {stage.label}
                  </Text>
                </View>

                {/* Dot */}
                <View style={styles.dotWrap}>
                  <View style={[styles.dot, { backgroundColor: dotBgColor, borderColor: dotBorderColor }]}>
                    {(hasVal || isActive) && <View style={styles.dotInner} />}
                  </View>
                </View>

                {/* Content */}
                <View style={styles.stageContent}>
                  {hasVal ? (
                    <View style={[styles.doneBox, { backgroundColor: t.accentBg, borderColor: t.accent }]}>
                      {progress[stage.key]?.assignee ? (
                        <Text style={[styles.doneText, { color: t.accent }]}>
                          {progress[stage.key].assignee}
                        </Text>
                      ) : null}
                      <Text style={[styles.doneSub, { color: t.subText }]}>
                        {stage.isOrder
                          ? `Value: ${progress[stage.key]?.value ?? '—'}`
                          : progress[stage.key]?.date || ''}
                      </Text>
                    </View>
                  ) : isActive ? (
                    <View>
                      <View style={styles.inputRow}>
                        <TextInput
                          style={[
                            styles.input,
                            {
                              backgroundColor: t.inputBg,
                              borderColor: inputs[`${stage.key}-assignee`] ? t.primary : t.inputBorder,
                              color: t.text,
                            },
                          ]}
                          placeholder="Assign to..."
                          placeholderTextColor={t.placeholder}
                          value={inputs[`${stage.key}-assignee`]}
                          onChangeText={(v) => updateInput(`${stage.key}-assignee`, v)}
                        />
                        <TouchableOpacity
                          style={[styles.saveBtn, { backgroundColor: t.primary }]}
                          onPress={() => handleSave(stage.key, stage.isOrder)}
                          disabled={saving === stage.key}
                        >
                          {saving === stage.key ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.saveBtnText}>➤</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                      {stage.isOrder ? (
                        <TextInput
                          style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.text }]}
                          placeholder="Order Value"
                          placeholderTextColor={t.placeholder}
                          value={inputs[`${stage.key}-value`]}
                          onChangeText={(v) => updateInput(`${stage.key}-value`, v)}
                          keyboardType="numeric"
                        />
                      ) : (
                        <>
                          {Platform.OS === 'web' ? (
                            <View
                              style={[
                                styles.dateInput,
                                styles.dateInputWebWrap,
                                { backgroundColor: t.inputBg, borderColor: t.inputBorder },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.dateInputText,
                                  { color: inputs[`${stage.key}-date`] ? t.text : t.placeholder },
                                ]}
                              >
                                {inputs[`${stage.key}-date`] || 'YYYY/MM/DD'}
                              </Text>
                              <Text style={[styles.dateIcon, { color: t.subText }]}>📅</Text>
                              <input
                                type="date"
                                value={toWebInputDate(inputs[`${stage.key}-date`])}
                                onChange={(e) =>
                                  updateInput(`${stage.key}-date`, fromWebInputDate(e.target.value))
                                }
                                style={styles.webNativeDateInput}
                                aria-label={`${stage.label} date`}
                              />
                            </View>
                          ) : (
                            <>
                              <TouchableOpacity
                                activeOpacity={0.8}
                                style={[styles.dateInput, { backgroundColor: t.inputBg, borderColor: t.inputBorder }]}
                                onPress={() => setOpenDateStage(stage.key)}
                              >
                                <Text
                                  style={[
                                    styles.dateInputText,
                                    { color: inputs[`${stage.key}-date`] ? t.text : t.placeholder },
                                  ]}
                                >
                                  {inputs[`${stage.key}-date`] || 'YYYY/MM/DD'}
                                </Text>
                                <Text style={[styles.dateIcon, { color: t.subText }]}>📅</Text>
                              </TouchableOpacity>

                              {openDateStage === stage.key && (
                                <DateTimePicker
                                  value={parseDate(inputs[`${stage.key}-date`])}
                                  mode="date"
                                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                  onChange={(event, selectedDate) =>
                                    handleDateChange(stage.key, event, selectedDate)
                                  }
                                />
                              )}
                            </>
                          )}
                        </>
                      )}
                    </View>
                  ) : (
                    <View style={[styles.pendingBox, { backgroundColor: t.inputBg, borderColor: t.inputBorder }]}>
                      <Text style={[styles.pendingText, { color: t.placeholder }]}>Pending</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Delete */}
        <TouchableOpacity
          style={[styles.deleteBtn, { backgroundColor: t.dangerBg, borderColor: t.dangerBorder }]}
          onPress={handleDelete}
        >
          <Text style={[styles.deleteBtnText, { color: t.danger }]}>🗑️ Delete Client</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FIX #2: Deliver button is a true toggle — never permanently disabled
          Shows loading spinner while saving, correct label for both states */}
      <TouchableOpacity
        style={[
          styles.deliverBtn,
          { backgroundColor: progress.delivered ? t.delivered : t.pending },
          delivering && { opacity: 0.7 },
        ]}
        onPress={handleToggleDelivered}
        disabled={delivering}
      >
        {delivering ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.deliverBtnText}>
            {progress.delivered ? '✓ Delivered — Tap to undo' : '📦 Mark as Delivered'}
          </Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 24 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 20, paddingBottom: 120 },
  clientCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 18, marginBottom: 28, borderWidth: 1 },
  clientIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  clientIconText: { fontSize: 26 },
  clientInfo: { marginLeft: 14, flex: 1 },
  clientLabel: { fontSize: 11, letterSpacing: 1, fontWeight: '600' },
  clientName: { fontSize: 20, fontWeight: 'bold', marginTop: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  editIcon: { fontSize: 14, marginLeft: 8 },
  editNameRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 6 },
  editNameInput: { flex: 1, borderWidth: 2, borderRadius: 10, padding: 8, fontSize: 16 },
  editNameSave: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  editNameSaveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  editNameCancel: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  editNameCancelText: { fontSize: 14, fontWeight: '600' },
  pipeline: { position: 'relative', marginBottom: 10 },
  pipelineLine: {
    position: 'absolute',
    left: LABEL_W + DOT_W / 2 - 1,
    top: 14,
    bottom: 14,
    width: 2,
    borderRadius: 1,
  },
  stageRow: { flexDirection: 'row', marginBottom: 24, alignItems: 'flex-start' },
  labelWrap: { width: LABEL_W, paddingRight: 8, alignItems: 'flex-end', paddingTop: 3 },
  stageLabel: { fontSize: 15, fontWeight: '600', textAlign: 'right' },
  dotWrap: { width: DOT_W, alignItems: 'center', paddingTop: 1 },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2.5, justifyContent: 'center', alignItems: 'center' },
  dotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  stageContent: { flex: 1, paddingLeft: 8 },
  doneBox: { borderRadius: 12, padding: 12, borderWidth: 1 },
  doneText: { fontSize: 15, fontWeight: '600' },
  doneSub: { fontSize: 13, marginTop: 2 },
  pendingBox: { borderRadius: 12, padding: 14, borderWidth: 1 },
  pendingText: { fontSize: 15, fontWeight: '500' },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  input: { flex: 1, borderWidth: 1.5, borderRadius: 12, padding: 12, fontSize: 15 },
  dateInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInputWebWrap: { position: 'relative' },
  dateInputText: { fontSize: 15, flex: 1 },
  dateIcon: { fontSize: 16, marginLeft: 8 },
  webNativeDateInput: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
  },
  saveBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16 },
  deleteBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12, borderWidth: 1 },
  deleteBtnText: { fontSize: 16, fontWeight: '600' },
  deliverBtn: { position: 'absolute', bottom: 30, left: 50, right: 50, padding: 18, borderRadius: 30, alignItems: 'center' },
  deliverBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});