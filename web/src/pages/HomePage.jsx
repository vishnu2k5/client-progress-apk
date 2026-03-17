import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addClient, getAllProgress, getClients, getMe, setAuthFailureHandler } from '../lib/api.js';
import { clearAuth, getOrgLogo, getOrgName, setOrgLogo, setOrgName } from '../lib/storage.js';
import { useToast } from '../components/Toast.jsx';

export default function HomePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [orgName, setOrgNameState] = useState(getOrgName() || 'Organization');
  const [orgLogo, setOrgLogoState] = useState(getOrgLogo());
  const [loading, setLoading] = useState(true);

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    return clients.filter((item) => item.clientName.toLowerCase().includes(search.toLowerCase()));
  }, [clients, search]);

  const loadClients = useCallback(async () => {
    try {
      const [clientsRes, progressRes] = await Promise.all([getClients(), getAllProgress()]);
      const deliveredMap = {};
      progressRes.data.forEach((entry) => {
        const id = entry.clientId?._id || entry.clientId;
        if (id) deliveredMap[id] = !!entry.delivered;
      });
      setClients(clientsRes.data.map((entry) => ({ ...entry, delivered: deliveredMap[entry._id] || false })));
    } catch (error) {
      showToast(error.response?.data?.message || 'Error loading clients', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadData = useCallback(async () => {
    try {
      setOrgNameState(getOrgName() || 'Organization');
      setOrgLogoState(getOrgLogo());
      const meRes = await getMe();
      const org = meRes.data.organization;
      if (org.organizationName) {
        setOrgName(org.organizationName);
        setOrgNameState(org.organizationName);
      }
      if (org.logo) {
        setOrgLogo(org.logo);
        setOrgLogoState(org.logo);
      }
    } catch {
    } finally {
      loadClients();
    }
  }, [loadClients]);

  useEffect(() => {
    setAuthFailureHandler(() => navigate('/login', { replace: true }));
    loadData();
    return () => setAuthFailureHandler(null);
  }, [loadData, navigate]);

  const handleAddClient = async () => {
    if (!newClientName.trim()) {
      showToast('Please enter client name', 'error');
      return;
    }
    try {
      await addClient(newClientName.trim());
      setNewClientName('');
      await loadClients();
      showToast('Client added!');
    } catch (error) {
      showToast(error.response?.data?.message || 'Error adding client', 'error');
    }
  };

  const handleLogout = () => {
    if (!window.confirm('Are you sure you want to logout?')) return;
    clearAuth();
    navigate('/login', { replace: true });
  };

  if (loading) {
    return <div className="center-loader">Loading...</div>;
  }

  return (
    <div className="page">
      <header className="top-header card">
        <div className="org-side">
          {orgLogo ? <img src={orgLogo} alt="Organization logo" className="org-logo" /> : <div className="org-avatar">🏢</div>}
          <strong>{orgName}</strong>
        </div>
        <div className="header-actions">
          <Link to="/profile" className="icon-btn">👤</Link>
          <button onClick={handleLogout} className="icon-btn danger" type="button">⎋</button>
        </div>
      </header>

      <div className="card section-stack">
        <input
          className="field"
          placeholder="🔍 Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="row">
          <input
            className="field"
            placeholder="New client name..."
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
          />
          <button className="primary-btn square" type="button" onClick={handleAddClient}>+</button>
        </div>
      </div>

      <div className="list-head">
        <h2>Clients ({filteredClients.length})</h2>
      </div>

      <div className="list">
        {filteredClients.length === 0 ? (
          <div className="card empty">No clients found</div>
        ) : (
          filteredClients.map((item) => (
            <Link to={`/progress/${item._id}`} state={{ clientName: item.clientName }} key={item._id} className="card client-item">
              <div className="client-left">
                <div className="client-icon">🏢</div>
                <div>
                  <div className="client-name">{item.clientName}</div>
                  <div className="muted">Added {new Date(item.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="client-right">
                {item.delivered ? <span className="badge">✓</span> : null}
                <span className="arrow">›</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
