import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

const ResetPassword = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const token = params.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { token, password });
      toast.success(res.data.message);
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Choose a new password" footer={<Link to="/forgot-password" className="font-medium text-brand-600 hover:text-brand-500">Need a new link?</Link>}>
      {!token ? (
        <p className="text-sm text-red-700">This link is missing its token. Request a new reset link.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="label-text">New password</label>
            <input id="password" type="password" minLength={6} required value={password} onChange={e => setPassword(e.target.value)} className="input-field" />
          </div>
          <div>
            <label htmlFor="confirm" className="label-text">Confirm new password</label>
            <input id="confirm" type="password" minLength={6} required value={confirm} onChange={e => setConfirm(e.target.value)} className="input-field" />
          </div>
          <button type="submit" disabled={loading} className="w-full btn-primary py-2.5">
            {loading ? 'Saving...' : 'Update password'}
          </button>
        </form>
      )}
    </AuthShell>
  );
};

export default ResetPassword;
