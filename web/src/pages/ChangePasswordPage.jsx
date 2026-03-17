import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
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
      showToast('Password changed successfully!');
      navigate(-1);
    } catch (error) {
      showToast(error.response?.data?.message || 'Error changing password', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <header className="top-header card">
        <button className="icon-btn" onClick={() => navigate(-1)} type="button">←</button>
        <strong>Change Password</strong>
        <div style={{ width: 42 }} />
      </header>

      <form className="card section-stack" onSubmit={handleSubmit}>
        <div className="center-emoji">🔐</div>
        <p className="muted">Enter your current password and choose a new password (minimum 6 characters).</p>

        <label className="label">Current Password</label>
        <input type="password" className="field" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />

        <label className="label">New Password</label>
        <input type="password" className="field" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />

        <label className="label">Confirm New Password</label>
        <input type="password" className="field" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />

        <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Updating...' : 'Update Password'}</button>
      </form>
    </div>
  );
}
