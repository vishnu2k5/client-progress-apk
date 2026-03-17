import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../lib/api.js';
import { isAuthed, setOrgLogo, setOrgName, setToken } from '../lib/storage.js';
import { useToast } from '../components/Toast.jsx';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logo, setLogo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthed()) navigate('/', { replace: true });
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      showToast('Please enter a valid email', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const res = await login(email.trim(), password);
        setToken(res.data.token);
        setOrgName(res.data.organization.organizationName || 'Organization');
        if (res.data.organization.logo) setOrgLogo(res.data.organization.logo);
        navigate('/', { replace: true });
        return;
      }

      if (!organizationName.trim()) {
        showToast('Organization name is required', 'error');
        setLoading(false);
        return;
      }
      if (!phone.trim()) {
        showToast('Phone number is required', 'error');
        setLoading(false);
        return;
      }
      if (!address.trim()) {
        showToast('Address is required', 'error');
        setLoading(false);
        return;
      }

      await register(
        {
          organizationName: organizationName.trim(),
          email: email.trim(),
          password,
          phone: phone.trim(),
          address: address.trim(),
        },
        logo
      );
      setIsLogin(true);
      setPassword('');
      setLogo(null);
      showToast('Registration successful! Please login.');
    } catch (error) {
      const message =
        error.response?.data?.message ||
        (error.code === 'ECONNABORTED' ? 'Request timed out' : 'Something went wrong');
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page">
      <div className="auth-wrap card">
        <div className="auth-brand">
          <img src="/logo.png" alt="Smarta Tech logo" className="brand-logo" />
          <h1>Smarta Tech</h1>
          <p>Tracker</p>
        </div>

        <div className="auth-tabs">
          <button className={isLogin ? 'active' : ''} onClick={() => setIsLogin(true)} type="button">Login</button>
          <button className={!isLogin ? 'active' : ''} onClick={() => setIsLogin(false)} type="button">Register</button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <>
              <label className="label">Organization Logo</label>
              <label className="logo-picker">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setLogo(event.target.files?.[0] || null)}
                />
                {logo ? <span>{logo.name}</span> : <span>Tap to add logo</span>}
              </label>

              <label className="label">Organization Name</label>
              <input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="e.g. Smarta Technologies" />
            </>
          )}

          <label className="label">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. info@smartatech.com" type="email" />

          <label className="label">Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="e.g. Min 6 characters" type="password" />

          {!isLogin && (
            <>
              <label className="label">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +91 98765 43210" />

              <label className="label">Address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 2/367, Society Colony..." />
            </>
          )}

          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? '...' : isLogin ? 'Login' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
}
