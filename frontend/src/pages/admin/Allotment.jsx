import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const ROUND_LABELS = { mock: 'Mock allotment', round1: 'Round 1', round2: 'Round 2', extended: 'Extended round' };

const STATUS_STYLES = {
  mock: 'bg-gray-100 text-gray-700',
  allotted: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  upgrade: 'bg-purple-100 text-purple-800',
  rejected: 'bg-orange-100 text-orange-800',
  quit: 'bg-red-100 text-red-800',
  lapsed: 'bg-red-100 text-red-800',
  superseded: 'bg-gray-100 text-gray-500'
};

const STATUS_LABELS = {
  mock: 'Mock',
  allotted: 'Choice pending',
  accepted: 'Choice 1: Joined',
  upgrade: 'Choice 2: Upgrade',
  rejected: 'Choice 3: Rejected',
  quit: 'Choice 4: Quit',
  lapsed: 'Lapsed',
  superseded: 'Moved to later round'
};

const Allotment = () => {
  const [roundsInfo, setRoundsInfo] = useState(null);
  const [selectedRound, setSelectedRound] = useState(null);
  const [allotments, setAllotments] = useState([]);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reportingDeadline, setReportingDeadline] = useState('');
  const [confirmReset, setConfirmReset] = useState('');
  const [categories, setCategories] = useState([]);
  const quotaLabel = (key) => categories.find(c => c.key === key)?.label || key;

  const activeRounds = (roundsInfo?.rounds || []).filter(r => r.status === 'completed');

  const fetchAll = async (roundId) => {
    try {
      const [roundsRes, seatRes] = await Promise.all([
        api.get('/admin/rounds'),
        api.get('/admin/seat-matrix')
      ]);
      setRoundsInfo(roundsRes.data);
      setSeats(seatRes.data.seats);

      const target = roundId ?? roundsRes.data.latestActiveId;
      setSelectedRound(target);
      if (target) {
        const res = await api.get(`/admin/allotment-results?roundId=${target}`);
        setAllotments(res.data);
      } else {
        setAllotments([]);
      }
    } catch (error) {
      toast.error('Failed to load allotment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    api.get('/admin/categories').then(res => setCategories(res.data)).catch(() => {});
  }, []);

  const runRound = async (type) => {
    const label = ROUND_LABELS[type];
    const note = type === 'mock'
      ? 'The mock allotment does not hold any seats and replaces any earlier mock run.'
      : 'Any faculty from the previous round who have not exercised a choice will lose their seat.';
    if (!window.confirm(`Run ${label}?\n\n${note}`)) return;

    setBusy(true);
    try {
      const res = await api.post('/admin/rounds', {
        type,
        reportingDeadline: reportingDeadline ? new Date(reportingDeadline).toISOString() : null
      });
      toast.success(res.data.message);
      fetchAll(res.data.round.id);
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to run ${label}`);
    } finally {
      setBusy(false);
    }
  };

  const undoLatest = async () => {
    const latest = activeRounds.at(-1);
    if (!latest) return;
    if (!window.confirm(`Undo ${latest.label}? Its allotments are deleted and the previous state is restored, including any seats that lapsed.`)) return;

    setBusy(true);
    try {
      const res = await api.post(`/admin/rounds/${latest.id}/undo`);
      toast.success(res.data.message);
      fetchAll(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to undo round');
    } finally {
      setBusy(false);
    }
  };

  const resetAll = async () => {
    setBusy(true);
    try {
      const res = await api.post('/admin/counselling/reset');
      toast.success(res.data.message);
      setConfirmReset('');
      fetchAll(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset counselling');
    } finally {
      setBusy(false);
    }
  };

  const selectRound = async (id) => {
    setSelectedRound(id);
    try {
      const res = await api.get(`/admin/allotment-results?roundId=${id}`);
      setAllotments(res.data);
    } catch (error) {
      toast.error('Failed to load round results');
    }
  };

  if (loading) return <Layout><LoadingSpinner /></Layout>;

  const nextRound = roundsInfo?.nextRound;
  const latest = activeRounds.at(-1);
  const selected = roundsInfo?.rounds.find(r => r.id === selectedRound);
  const vacancies = seats.filter(s => s.college?.isActive !== false)
    .reduce((acc, s) => ({ total: acc.total + s.totalSeats, filled: acc.filled + s.filledSeats }), { total: 0, filled: 0 });

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Counselling Rounds</h1>
        <p className="mt-1 text-sm text-gray-500">
          Mock allotment, then Round 1, Round 2 and the extended round. Each faculty member gets the highest option on
          their list that still has a vacancy, in merit order.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white shadow sm:rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Run a round</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label-text">Reporting deadline (printed on allotment orders)</label>
              <input type="datetime-local" value={reportingDeadline} onChange={e => setReportingDeadline(e.target.value)} className="input-field" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => runRound('mock')} disabled={busy || !roundsInfo?.canRunMock} className="btn-secondary">
              Run Mock Allotment
            </button>
            <button onClick={() => runRound(nextRound)} disabled={busy || !nextRound} className="btn-primary">
              {nextRound ? `Run ${ROUND_LABELS[nextRound]}` : 'All rounds completed'}
            </button>
            <button onClick={undoLatest} disabled={busy || !latest} className="btn-secondary">
              {latest ? `Undo ${latest.label}` : 'Undo last round'}
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Before running the next round, update the option entry, results and choices dates on the Schedule page.
          </p>
        </div>

        <div className="bg-white shadow sm:rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Seats</h3>
          <p className="text-3xl font-bold text-gray-900">{vacancies.total - vacancies.filled}<span className="text-base font-normal text-gray-500"> vacant of {vacancies.total}</span></p>
          <div className="mt-6 border-t pt-4">
            <h4 className="text-sm font-medium text-red-700">Reset all counselling</h4>
            <p className="text-xs text-gray-500 mt-1">Deletes every round and allotment. Type RESET to confirm.</p>
            <div className="mt-2 flex gap-2">
              <input value={confirmReset} onChange={e => setConfirmReset(e.target.value)} className="input-field mt-0" placeholder="RESET" />
              <button onClick={resetAll} disabled={busy || confirmReset !== 'RESET'} className="btn-danger">Reset</button>
            </div>
          </div>
        </div>
      </div>

      {roundsInfo?.rounds.length > 0 && (
        <div className="mb-4 border-b border-gray-200">
          <nav className="-mb-px flex flex-wrap gap-x-8">
            {[...roundsInfo.rounds].reverse().filter(r => r.status === 'completed').map(r => (
              <button
                key={r.id}
                onClick={() => selectRound(r.id)}
                className={`${selectedRound === r.id ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
              >
                {r.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {selected?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {[
            ['Participants', selected.summary.participants],
            ['Allotted', selected.summary.allotted],
            ['Upgraded / retained', `${selected.summary.upgraded} / ${selected.summary.retained}`],
            ['Not allotted', selected.summary.notAllotted]
          ].map(([label, value]) => (
            <div key={label} className="bg-white p-4 rounded-lg shadow text-center">
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-xl font-bold">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Faculty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">College</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quota</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Option #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joining</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allotments.map(a => (
                <tr key={a._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{a.faculty?.rank || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{a.faculty?.name}</div>
                    <div className="text-xs text-gray-500">Score {a.faculty?.totalScore ?? 0}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {a.college?.name} <span className="text-gray-500">({a.college?.code})</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{a.department}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{quotaLabel(a.category)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {a.optionNumber || '-'}{a.retained && <span className="ml-1 text-xs text-gray-500">(retained)</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_STYLES[a.status]}`}>
                      {STATUS_LABELS[a.status] || a.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {a.reportingStatus === 'reported' && <span className="text-green-700">Reported</span>}
                    {a.reportingStatus === 'not_reported' && <span className="text-red-700" title={a.reportingNote || ''}>Did not report</span>}
                    {!a.reportingStatus && <span className="text-gray-400">–</span>}
                  </td>
                </tr>
              ))}
              {allotments.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                    No allotments yet. Generate the merit list, then run the mock allotment or Round 1.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-3">Seat matrix</h3>
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">College</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quotas (filled / seats)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Filled / Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vacant</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {seats.map(s => (
                <tr key={s.id}>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                    {s.college?.name} {s.college?.isActive === false && <span className="text-xs text-red-600">(inactive)</span>}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">{s.department}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">
                    {Object.entries(s.categorySeats || {}).map(([k, n]) => `${quotaLabel(k)} ${s.filledByCategory?.[k] || 0}/${n}`).join(' · ')}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">{s.filledSeats} / {s.totalSeats}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{s.totalSeats - s.filledSeats}</td>
                </tr>
              ))}
              {seats.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">No department seats configured. Add them on the Colleges page.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default Allotment;
