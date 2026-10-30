import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Reset your password" footer={<Link to="/" className="font-medium text-brand-600 hover:text-brand-500">Back to sign in</Link>}>
      {sent ? (
        <p className="text-sm text-gray-700">
          If an account exists for <strong>{email}</strong>, we have sent a link to reset your password. It is valid for one hour.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <p className="text-sm text-gray-600">Enter the email you registered with and we will send you a reset link.</p>
          <div>
            <label htmlFor="email" className="label-text">Email address</label>
            <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input-field" />
          </div>
          <button type="submit" disabled={loading} className="w-full btn-primary py-2.5">
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthShell>
  );
};

export default ForgotPassword;
