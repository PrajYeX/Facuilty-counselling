import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const ROUND_LABELS = { mock: 'Mock allotment', round1: 'Round 1', round2: 'Round 2', extended: 'Extended round' };

const STATUS_TEXT = {
  allotted: 'Choice pending',
  accepted: 'Choice 1: Accepted and joining',
  upgrade: 'Choice 2: Accepted, trying for a better option',
  rejected: 'Choice 3: Rejected, staying for next round',
  quit: 'Choice 4: Quit counselling',
  lapsed: 'Lapsed (no choice made)',
  superseded: 'Replaced by a later round'
};

const CHOICE_STATUS = { accept: 'accepted', upgrade: 'upgrade', reject: 'rejected', quit: 'quit' };

const formatDate = (d, withTime = false) => (d
  ? new Date(d).toLocaleString(undefined, withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' })
  : '-');

const Detail = ({ label, children }) => (
  <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
    <dt className="text-sm font-medium text-gray-500">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{children}</dd>
  </div>
);

const AllotmentStatus = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [choice, setChoice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [categories, setCategories] = useState([]);

  const fetchData = async () => {
    try {
      const res = await api.get('/faculty/allotment-status');
      setData(res.data);
      const current = Object.entries(CHOICE_STATUS).find(([, status]) => status === res.data.current?.status);
      setChoice(current ? current[0] : '');
    } catch (error) {
      toast.error('Failed to load allotment status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    api.get('/public/categories').then(res => setCategories(res.data)).catch(() => {});
  }, []);

  const quotaLabel = (key) => categories.find(c => c.key === key)?.label || key;

  const submitChoice = async () => {
    if (choice === 'quit' && !window.confirm('Quit counselling? You give up this seat and will not be considered in later rounds.')) return;
    setSubmitting(true);
    try {
      const res = await api.post('/faculty/allotment/choice', { choice });
      toast.success(res.data.message);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record choice');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadOrder = async () => {
    setDownloading(true);
    try {
      const res = await api.get('/faculty/allotment/order.pdf', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `allotment-order-${data.current.id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download allotment order');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <Layout><LoadingSpinner /></Layout>;

  const header = (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900">Allotment Status</h1>
      <p className="mt-1 text-sm text-gray-500">Your seat allotment for each counselling round.</p>
    </div>
  );

  if (!data?.resultsPublished) {
    return (
      <Layout>
        {header}
        <div className="bg-white shadow sm:rounded-lg max-w-3xl p-6 text-center">
          <h3 className="text-sm font-medium text-gray-900">Results are not published yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            {data?.resultsAt ? `Results will be published on ${formatDate(data.resultsAt, true)}.` : 'Check back after the allotment is run.'}
          </p>
        </div>
      </Layout>
    );
  }

  const { current, mock, latestRound, history, canChoose, allowedChoices, choicesOpen, choicesEndAt, choiceLabels } = data;
  const inLatestRound = current && latestRound && current.roundId === latestRound.id;
  const holdsSeat = current && ['allotted', 'accepted', 'upgrade'].includes(current.status);

  return (
    <Layout>
      {header}

      {mock && (
        <div className="bg-white shadow sm:rounded-lg max-w-3xl mb-6 border border-gray-200">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h3 className="text-lg font-medium text-gray-900">Mock allotment result</h3>
            <p className="text-sm text-gray-500">For information only. It does not hold a seat. You can still change your options before Round 1.</p>
          </div>
          <dl className="divide-y divide-gray-200">
            <Detail label="College">{mock.college?.name} ({mock.college?.code})</Detail>
            <Detail label="Department">{mock.department}</Detail>
            <Detail label="Option number">{mock.optionNumber || '-'}</Detail>
          </dl>
        </div>
      )}
      {!mock && data.mockRound && !current && (
        <div className="bg-white shadow sm:rounded-lg max-w-3xl mb-6 p-6">
          <h3 className="text-lg font-medium text-gray-900">Mock allotment result</h3>
          <p className="mt-1 text-sm text-gray-500">
            You would not be allotted any seat with your current options. Consider <Link to="/faculty/options" className="text-brand-600 underline">adding more options</Link> before Round 1.
          </p>
        </div>
      )}

      {current && (
        <div className={`bg-white shadow sm:rounded-lg max-w-3xl mb-6 border ${holdsSeat ? 'border-teal-200' : 'border-gray-200'}`}>
          <div className={`px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 ${holdsSeat ? 'bg-teal-50' : 'bg-gray-50'}`}>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {ROUND_LABELS[current.counsellingRound?.type]} allotment
              </h3>
              {!inLatestRound && latestRound && (
                <p className="text-sm text-gray-600">No new seat in {ROUND_LABELS[latestRound.type]}.</p>
              )}
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white border text-gray-800">
              {STATUS_TEXT[current.status] || current.status}
            </span>
          </div>
          <dl className="divide-y divide-gray-200">
            <Detail label="College">
              <span className="font-semibold">{current.college?.name}</span> ({current.college?.code})
            </Detail>
            <Detail label="Department">{current.department}</Detail>
            {categories.length > 1 && <Detail label="Seat quota">{quotaLabel(current.category)}</Detail>}
            <Detail label="Location">{[current.college?.location, current.college?.district].filter(Boolean).join(', ')}</Detail>
            <Detail label="Tier">{current.college?.tier}</Detail>
            <Detail label="Option number">
              {current.optionNumber || '-'}{current.retained && <span className="text-gray-500"> (kept from previous round)</span>}
            </Detail>
            <Detail label="Report by">{formatDate(current.counsellingRound?.reportingDeadline, true)}</Detail>
            {current.reportingStatus && (
              <Detail label="Joining">
                {current.reportingStatus === 'reported'
                  ? <span className="text-green-700 font-medium">Confirmed by college on {formatDate(current.reportedAt)}</span>
                  : <span className="text-red-700 font-medium">College recorded that you did not report{current.reportingNote ? `: ${current.reportingNote}` : ''}</span>}
              </Detail>
            )}
          </dl>
          {holdsSeat && (
            <div className="px-6 py-4 border-t">
              <button onClick={downloadOrder} disabled={downloading} className="btn-secondary">
                {downloading ? 'Preparing...' : 'Download Allotment Order (PDF)'}
              </button>
            </div>
          )}
        </div>
      )}

      {canChoose && (
        <div className="bg-white shadow sm:rounded-lg max-w-3xl mb-6 p-6">
          <h3 className="text-lg font-medium text-gray-900">Post-allotment choice</h3>
          <p className="mt-1 text-sm text-gray-500">
            {choicesOpen
              ? <>You can change your choice until {choicesEndAt ? <strong>{formatDate(choicesEndAt, true)}</strong> : 'the next round is run'}. If you do not choose, the seat lapses and you leave counselling.</>
              : 'The choices window is closed.'}
          </p>
          <div className="mt-4 space-y-3">
            {allowedChoices.map(key => (
              <label key={key} className={`flex items-start gap-3 p-3 border rounded-md ${choice === key ? 'border-brand-500 bg-brand-50' : 'border-gray-200'} ${choicesOpen ? 'cursor-pointer' : 'opacity-60'}`}>
                <input
                  type="radio"
                  name="choice"
                  value={key}
                  checked={choice === key}
                  onChange={() => setChoice(key)}
                  disabled={!choicesOpen}
                  className="mt-1"
                />
                <span className="text-sm text-gray-900">{choiceLabels[key]}</span>
              </label>
            ))}
          </div>
          <button
            onClick={submitChoice}
            disabled={!choicesOpen || !choice || submitting || CHOICE_STATUS[choice] === current.status}
            className="mt-4 btn-primary"
          >
            {submitting ? 'Saving...' : 'Submit Choice'}
          </button>
        </div>
      )}

      {!current && !mock && latestRound && (
        <div className="bg-white shadow sm:rounded-lg max-w-3xl mb-6 p-6 text-center">
          <h3 className="text-sm font-medium text-gray-900">No seat allotted in {ROUND_LABELS[latestRound.type]}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {data.nextRound
              ? <>You stay in counselling for {ROUND_LABELS[data.nextRound]}. Seats given up by others go back into the pool. You can <Link to="/faculty/options" className="text-brand-600 underline">review your options</Link> while option entry is open.</>
              : 'All counselling rounds are complete.'}
          </p>
        </div>
      )}

      {!current && !mock && !latestRound && !data.mockRound && (
        <div className="bg-white shadow sm:rounded-lg max-w-3xl p-6 text-center">
          <h3 className="text-sm font-medium text-gray-900">No allotment yet</h3>
          <p className="mt-1 text-sm text-gray-500">Allotment has not been run yet. Make sure your <Link to="/faculty/options" className="text-brand-600 underline">options</Link> are saved.</p>
        </div>
      )}

      {history.length > 1 && (
        <div className="bg-white shadow sm:rounded-lg max-w-3xl overflow-hidden">
          <div className="px-6 py-4 border-b"><h3 className="text-lg font-medium text-gray-900">History</h3></div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Round</th>
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">College</th>
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {history.map(a => (
                <tr key={a.id}>
                  <td className="px-6 py-3 text-sm text-gray-900">{ROUND_LABELS[a.counsellingRound?.type]}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{a.college?.code} · {a.department}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{STATUS_TEXT[a.status] || a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
};

export default AllotmentStatus;
