import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMe, updateProfile } from '../lib/api.js';
import { setOrgLogo, setOrgName } from '../lib/storage.js';
import { useToast } from '../components/Toast.jsx';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [profile, setProfile] = useState(null);
  const [orgName, setOrgNameState] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [newLogo, setNewLogo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await getMe();
        const org = res.data.organization;
        setProfile(org);
        setOrgNameState(org.organizationName || '');
        setPhone(org.phone || '');
        setAddress(org.address || '');
      } catch {
        showToast('Error loading profile', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [showToast]);

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
      setOrgName(org.organizationName);
      if (org.logo) setOrgLogo(org.logo);
      showToast('Profile updated!');
    } catch (error) {
      showToast(error.response?.data?.message || 'Error updating profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="center-loader">Loading...</div>;

  return (
    <div className="page">
      <header className="top-header card">
        <button className="icon-btn" onClick={() => navigate(-1)} type="button">←</button>
        <strong>Profile</strong>
        <div style={{ width: 42 }} />
      </header>

      <div className="card profile-top">
        {newLogo ? (
          <img src={URL.createObjectURL(newLogo)} alt="New logo" className="avatar" />
        ) : profile?.logo ? (
          <img src={profile.logo} alt="Organization logo" className="avatar" />
        ) : (
          <div className="avatar">{profile?.organizationName?.charAt(0)?.toUpperCase() || '?'}</div>
        )}
        <label className="logo-picker small-picker">
          <input type="file" accept="image/*" onChange={(e) => setNewLogo(e.target.files?.[0] || null)} />
          <span>Tap photo to change logo</span>
        </label>
        <div className="muted">{profile?.email}</div>
      </div>

      <div className="card section-stack">
        <h3>Organization Details</h3>
        <label className="label">Organization Name</label>
        <input className="field" value={orgName} onChange={(e) => setOrgNameState(e.target.value)} />

        <label className="label">Email</label>
        <div className="readonly">{profile?.email}</div>

        <label className="label">Phone</label>
        <input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} />

        <label className="label">Address</label>
        <textarea className="field" value={address} onChange={(e) => setAddress(e.target.value)} rows={3} />

        <button type="button" className="primary-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="card section-stack">
        <h3>Security</h3>
        <Link to="/change-password" className="menu-link">🔒 Change Password <span>›</span></Link>
      </div>

      <div className="card section-stack">
        <h3>Account Info</h3>
        <div className="info-row"><span className="muted">Status</span><span className="badge">{profile?.isActive ? 'Active' : 'Inactive'}</span></div>
        <div className="info-row"><span className="muted">Joined</span><span>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '-'}</span></div>
      </div>
    </div>
  );
}
