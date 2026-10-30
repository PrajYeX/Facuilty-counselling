import { useState } from 'react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

const EmailVerifyBanner = ({ email }) => {
  const [sending, setSending] = useState(false);

  const resend = async () => {
    setSending(true);
    try {
      const res = await api.post('/auth/resend-verification');
      toast.success(res.data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mb-6 p-4 rounded-lg border border-yellow-200 bg-yellow-50 text-sm text-yellow-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <span>
        Please verify your email address. We sent a link to <strong>{email}</strong>. You can't upload documents or enter options until it's verified.
      </span>
      <button onClick={resend} disabled={sending} className="btn-secondary whitespace-nowrap">
        {sending ? 'Sending...' : 'Resend link'}
      </button>
    </div>
  );
};

export default EmailVerifyBanner;
