import { useState } from 'react';
import PublicLayout from '../components/PublicLayout';
import api from '../api/axios';

const RankLookup = () => {
  const [form, setForm] = useState({ email: '', dateOfBirth: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post('/public/rank-lookup', form);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-900">Rank Lookup</h1>
        <p className="mt-1 text-sm text-gray-500">Enter the email you registered with and your date of birth.</p>

        <form onSubmit={handleSubmit} className="mt-6 bg-white shadow sm:rounded-lg p-6 space-y-4">
          <div>
            <label htmlFor="email" className="label-text">Registered email</label>
            <input id="email" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" />
          </div>
          <div>
            <label htmlFor="dob" className="label-text">Date of birth</label>
            <input id="dob" type="date" required value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} className="input-field" />
          </div>
          <button type="submit" disabled={loading} className="w-full btn-primary">{loading ? 'Looking up...' : 'Find my rank'}</button>
        </form>

        {error && <div className="mt-4 p-3 rounded-md border border-red-200 bg-red-50 text-sm text-red-800">{error}</div>}

        {result && (
          <div className="mt-4 bg-white shadow sm:rounded-lg p-6">
            <p className="text-sm text-gray-500">{result.name} · {result.category}</p>
            {result.rank ? (
              <>
                <p className="mt-2 text-4xl font-bold text-gray-900">#{result.rank}</p>
                <p className="mt-1 text-sm text-gray-600">Merit score {result.totalScore}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-gray-700">
                {result.verificationStatus === 'verified'
                  ? 'You are verified. Ranks will appear once the merit list is published.'
                  : `Not ranked yet: your documents are ${result.verificationStatus === 'rejected' ? 'awaiting corrections' : 'under review'}.`}
              </p>
            )}
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

export default RankLookup;
