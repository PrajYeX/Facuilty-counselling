import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';
import AnnouncementsBoard from '../../components/AnnouncementsBoard';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';

const STATUS_LABELS = {
  allotted: 'Choice pending',
  accepted: 'Accepted (joining)',
  upgrade: 'Accepted, may upgrade'
};

const formatDate = (d) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '-');

const CollegeDashboard = () => {
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [notes, setNotes] = useState({});
  const [saving, setSaving] = useState(null);

  const load = async () => {
    try {
      const res = await api.get('/college/overview');
      setData(res.data);
    } catch (error) {
      toast.error('Failed to load allotted faculty');
    }
  };

  useEffect(() => {
    load();
    api.get('/public/categories').then(res => setCategories(res.data)).catch(() => {});
  }, []);

  const mark = async (allotment, status) => {
    if (status === 'not_reported' && !notes[allotment.id]?.trim()) {
      toast.error('Add a note explaining why they did not report');
      return;
    }
    setSaving(allotment.id);
    try {
      await api.put(`/college/allotments/${allotment.id}/reporting`, { status, note: notes[allotment.id] });
      toast.success(status === 'reported' ? 'Marked as reported' : status ? 'Marked as not reported' : 'Reporting status cleared');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(null);
    }
  };

  if (!data) return <Layout><LoadingSpinner /></Layout>;

  const { college, allotments } = data;
  const label = (key) => categories.find(c => c.key === key)?.label || key;
  const reported = allotments.filter(a => a.reportingStatus === 'reported').length;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{college.name}</h1>
        <p className="mt-1 text-sm text-gray-500">{college.code} · {[college.location, college.district].filter(Boolean).join(', ')} · {college.tier}</p>
      </div>

      <AnnouncementsBoard />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          ['Seats', college.totalSeats],
          ['Allotted', allotments.length],
          ['Reported', reported],
          ['Awaiting', allotments.length - reported]
        ].map(([title, value]) => (
          <div key={title} className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white shadow sm:rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Allotted faculty</h3>
          <p className="text-sm text-gray-500">Confirm each faculty member once they report for duty. They are notified when you do.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Faculty</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Round</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Choice</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Report by</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reporting</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {allotments.map(a => (
                <tr key={a.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{a.faculty?.name}</div>
                    <div className="text-xs text-gray-500">{a.faculty?.email}{a.faculty?.phone ? ` · ${a.faculty.phone}` : ''}</div>
                    <div className="text-xs text-gray-500">Rank #{a.faculty?.rank}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {a.department}
                    {categories.length > 1 && <div className="text-xs text-gray-500">{label(a.category)} quota</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{a.roundLabel}</td>
                  <td className="px-4 py-3 text-gray-700">{STATUS_LABELS[a.status] || a.status}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDate(a.counsellingRound?.reportingDeadline)}</td>
                  <td className="px-4 py-3 min-w-[16rem]">
                    {a.reportingStatus ? (
                      <div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${a.reportingStatus === 'reported' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {a.reportingStatus === 'reported' ? `Reported ${formatDate(a.reportedAt)}` : 'Did not report'}
                        </span>
                        {a.reportingNote && <p className="mt-1 text-xs text-gray-600">{a.reportingNote}</p>}
                        <button onClick={() => mark(a, null)} disabled={saving === a.id} className="block mt-1 text-xs text-brand-600 hover:text-brand-800">Undo</button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          value={notes[a.id] || ''}
                          onChange={e => setNotes(prev => ({ ...prev, [a.id]: e.target.value }))}
                          className="input-field mt-0 text-xs"
                          placeholder="Note (required if not reported)"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => mark(a, 'reported')} disabled={saving === a.id} className="btn-success px-3 py-1 text-xs">Reported</button>
                          <button onClick={() => mark(a, 'not_reported')} disabled={saving === a.id} className="btn-secondary px-3 py-1 text-xs">Did not report</button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {allotments.length === 0 && (
                <tr><td colSpan="6" className="px-4 py-6 text-center text-gray-500">No faculty have been allotted to your college yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b"><h3 className="text-lg font-medium text-gray-900">Your seats</h3></div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quotas</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Filled / Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {college.seats.map(s => (
                <tr key={s.id}>
                  <td className="px-4 py-3 text-gray-900">{s.department}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {Object.entries(s.categorySeats).map(([k, n]) => `${label(k)}: ${s.filledByCategory[k] || 0}/${n}`).join(' · ')}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-900">{s.filledSeats} / {s.totalSeats}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default CollegeDashboard;
