import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { deleteClient, getProgress, updateClient, updateProgress } from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';

const STAGES = [
  { key: 'Lead', label: 'Lead' },
  { key: 'firstContact', label: 'First Contact' },
  { key: 'followUp', label: 'Follow Up' },
  { key: 'RFQ', label: 'RFQ' },
  { key: 'quote', label: 'Quote' },
  { key: 'quoteFollowUp', label: 'Quote Follow Up' },
  { key: 'order', label: 'Order', isOrder: true },
];

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}/${month}/${day}`;
};

const toInputDate = (value) => (value ? value.replace(/\//g, '-') : '');
const fromInputDate = (value) => (value ? value.replace(/-/g, '/') : '');

export default function ProgressPage() {
  const { clientId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [progress, setProgress] = useState({});
  const [inputs, setInputs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [currentName, setCurrentName] = useState(location.state?.clientName || 'Client');
  const [clientNameInput, setClientNameInput] = useState(location.state?.clientName || '');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getProgress(clientId);
        const data = res.data[0] || {};
        setProgress(data);
        const initialInputs = {};
        STAGES.forEach((stage) => {
          const stageData = data[stage.key] || {};
          initialInputs[`${stage.key}-assignee`] = stageData.assignee || '';
          if (stage.isOrder) initialInputs[`${stage.key}-value`] = stageData.value?.toString() || '';
          else initialInputs[`${stage.key}-date`] = stageData.date || '';
        });
        setInputs(initialInputs);
      } catch {
        showToast('Error loading progress', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [clientId, showToast]);

  const updateInput = (key, value) => setInputs((prev) => ({ ...prev, [key]: value }));

  const hasValue = (stageKey, isOrder) => {
    const data = progress[stageKey];
    if (!data) return false;
    return isOrder ? !!(data.assignee || data.value) : !!(data.assignee || data.date);
  };

  const firstIncomplete = useMemo(() => STAGES.findIndex((stage) => !hasValue(stage.key, stage.isOrder)), [progress]);

  const handleSave = async (stageKey, isOrder) => {
    setSaving(stageKey);
    try {
      const assignee = inputs[`${stageKey}-assignee`] || null;
      const stageData = { assignee };
      if (isOrder) {
        const value = inputs[`${stageKey}-value`];
        stageData.value = value ? Number(value) : null;
      } else {
        const date = inputs[`${stageKey}-date`] || formatDate(new Date());
        stageData.date = date;
        updateInput(`${stageKey}-date`, date);
      }
      await updateProgress(clientId, { [stageKey]: stageData });
      setProgress((prev) => ({ ...prev, [stageKey]: stageData }));
      showToast('Saved!');
    } catch {
      showToast('Error saving', 'error');
    } finally {
      setSaving(null);
    }
  };

  const handleToggleDelivered = async () => {
    const newStatus = !progress.delivered;
    try {
      await updateProgress(clientId, { delivered: newStatus });
      setProgress((prev) => ({ ...prev, delivered: newStatus }));
      showToast(newStatus ? 'Marked as Delivered!' : 'Marked as Pending');
    } catch {
      showToast('Error updating status', 'error');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this client? This action cannot be undone.')) return;
    try {
      await deleteClient(clientId);
      showToast('Client deleted');
      navigate('/');
    } catch {
      showToast('Error deleting client', 'error');
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
    try {
      await updateClient(clientId, clientNameInput.trim());
      setCurrentName(clientNameInput.trim());
      setEditingName(false);
      showToast('Client name updated!');
    } catch (error) {
      showToast(error.response?.data?.message || 'Error updating name', 'error');
    }
  };

  if (loading) return <div className="center-loader">Loading...</div>;

  return (
    <div className="page">
      <header className="top-header card">
        <Link to="/" className="icon-btn">←</Link>
        <strong>Client Progress</strong>
        <div style={{ width: 42 }} />
      </header>

      <div className="card client-head">
        <div className="client-icon">🏢</div>
        <div className="grow">
          <div className="muted small">CLIENT PROGRESS</div>
          {editingName ? (
            <div className="row">
              <input className="field" value={clientNameInput} onChange={(e) => setClientNameInput(e.target.value)} />
              <button type="button" className="primary-btn square" onClick={handleEditName}>✓</button>
              <button type="button" className="icon-btn danger" onClick={() => { setEditingName(false); setClientNameInput(currentName); }}>✕</button>
            </div>
          ) : (
            <button type="button" className="name-edit" onClick={() => setEditingName(true)}>
              <span className="client-name">{currentName}</span>
              <span>✏️</span>
            </button>
          )}
        </div>
      </div>

      <div className="pipeline">
        {STAGES.map((stage, index) => {
          const completed = hasValue(stage.key, stage.isOrder);
          const active = index === firstIncomplete;

          return (
            <div key={stage.key} className="stage-row card">
              <div className="stage-left">
                <div className={`dot ${completed ? 'done' : active ? 'active' : ''}`} />
                <strong>{stage.label}</strong>
              </div>
              <div className="stage-right">
                {completed ? (
                  <div className="done-box">
                    {progress[stage.key]?.assignee ? <div>{progress[stage.key].assignee}</div> : null}
                    <div className="muted">
                      {stage.isOrder ? `Value: ${progress[stage.key]?.value ?? '—'}` : progress[stage.key]?.date || ''}
                    </div>
                  </div>
                ) : active ? (
                  <>
                    <div className="row">
                      <input
                        className="field"
                        placeholder="Assign to..."
                        value={inputs[`${stage.key}-assignee`] || ''}
                        onChange={(e) => updateInput(`${stage.key}-assignee`, e.target.value)}
                      />
                      <button
                        type="button"
                        className="primary-btn square"
                        disabled={saving === stage.key}
                        onClick={() => handleSave(stage.key, stage.isOrder)}
                      >
                        {saving === stage.key ? '...' : '➤'}
                      </button>
                    </div>
                    {stage.isOrder ? (
                      <input
                        className="field"
                        placeholder="Order Value"
                        value={inputs[`${stage.key}-value`] || ''}
                        onChange={(e) => updateInput(`${stage.key}-value`, e.target.value)}
                      />
                    ) : (
                      <label className="field date-shell">
                        <span>{inputs[`${stage.key}-date`] || 'YYYY/MM/DD'}</span>
                        <span>📅</span>
                        <input
                          type="date"
                          value={toInputDate(inputs[`${stage.key}-date`] || '')}
                          onChange={(e) => updateInput(`${stage.key}-date`, fromInputDate(e.target.value))}
                        />
                      </label>
                    )}
                  </>
                ) : (
                  <div className="pending">Pending</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button type="button" className="danger-btn" onClick={handleDelete}>🗑️ Delete Client</button>

      <button
        type="button"
        className={`deliver-btn ${progress.delivered ? 'done' : ''}`}
        disabled={progress.delivered}
        onClick={handleToggleDelivered}
      >
        {progress.delivered ? '✓ Delivered' : '📦 Mark as Delivered'}
      </button>
    </div>
  );
}
