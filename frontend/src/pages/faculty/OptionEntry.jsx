import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import PhaseBanner from '../../components/PhaseBanner';
import useSchedule from '../../hooks/useSchedule';
import { HiArrowUp, HiArrowDown, HiXMark, HiPlus } from 'react-icons/hi2';

const OptionEntry = () => {
  const [profile, setProfile] = useState(null);
  const [available, setAvailable] = useState([]);
  const [specialization, setSpecialization] = useState(null);
  const [selected, setSelected] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const schedule = useSchedule();

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, availRes, optRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/faculty/options/available'),
          api.get('/faculty/options')
        ]);
        setProfile(meRes.data);
        setAvailable(availRes.data.seats);
        setSpecialization(availRes.data.specialization);
        const seats = optRes.data.filter(o => o.seat).map(o => ({ ...o.seat, filledSeats: undefined }));
        setSelected(seats);
        setSavedIds(seats.map(s => s.id));
      } catch (error) {
        toast.error('Failed to load options');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const selectedIds = useMemo(() => new Set(selected.map(s => s.id)), [selected]);
  const dirty = selected.map(s => s.id).join(',') !== savedIds.join(',');

  const choices = available.filter(s => {
    if (selectedIds.has(s.id)) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [s.college.name, s.college.code, s.college.location, s.college.district, s.college.tier]
      .some(v => v?.toLowerCase().includes(q));
  });

  const move = (index, delta) => {
    setSelected(prev => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/faculty/options', { seatIds: selected.map(s => s.id) });
      setSavedIds(selected.map(s => s.id));
      toast.success(res.data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save options');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Layout><LoadingSpinner /></Layout>;

  const isOpen = schedule?.option_entry?.isOpen !== false;
  const verified = profile?.verificationStatus === 'verified';
  const editable = isOpen && verified;

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Option Entry</h1>
          <p className="mt-1 text-sm text-gray-500">
            List the colleges you want in order of preference. You are allotted the highest option that still has a
            vacancy when your merit rank is reached.
          </p>
        </div>
        <button onClick={handleSave} disabled={!editable || saving || !dirty} className="mt-4 sm:mt-0 btn-primary">
          {saving ? 'Saving...' : dirty ? 'Save Options' : 'Saved'}
        </button>
      </div>

      <PhaseBanner phase={schedule?.option_entry} />

      {!verified && (
        <div className="mb-4 p-3 rounded-md border border-yellow-200 bg-yellow-50 text-sm text-yellow-800">
          Option entry opens once all your documents are verified. <Link to="/faculty/upload-documents" className="underline">Check your documents</Link>.
        </div>
      )}
      {!specialization && (
        <div className="mb-4 p-3 rounded-md border border-yellow-200 bg-yellow-50 text-sm text-yellow-800">
          Set your specialization on the <Link to="/faculty/profile" className="underline">Profile</Link> page to see matching seats.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow sm:rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">My options ({selected.length})</h3>
            <p className="text-xs text-gray-500 mt-1">Option 1 is your most preferred.</p>
          </div>
          <ol className="divide-y divide-gray-200">
            {selected.map((seat, index) => (
              <li key={seat.id} className="px-6 py-3 flex items-center gap-3">
                <span className="w-8 text-sm font-bold text-brand-600">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{seat.college?.name}</p>
                  <p className="text-xs text-gray-500">{seat.college?.code} · {seat.department} · {seat.college?.tier} · {seat.totalSeats} seat(s)</p>
                </div>
                {editable && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <button onClick={() => move(index, -1)} disabled={index === 0} className="hover:text-gray-900 disabled:opacity-30" title="Move up"><HiArrowUp /></button>
                    <button onClick={() => move(index, 1)} disabled={index === selected.length - 1} className="hover:text-gray-900 disabled:opacity-30" title="Move down"><HiArrowDown /></button>
                    <button onClick={() => setSelected(prev => prev.filter(s => s.id !== seat.id))} className="text-red-500 hover:text-red-700" title="Remove"><HiXMark /></button>
                  </div>
                )}
              </li>
            ))}
            {selected.length === 0 && (
              <li className="px-6 py-8 text-center text-sm text-gray-500">No options yet. Add colleges from the list.</li>
            )}
          </ol>
        </div>

        <div className="bg-white shadow sm:rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Available seats{specialization ? ` in ${specialization}` : ''}
            </h3>
            <input value={search} onChange={e => setSearch(e.target.value)} className="input-field" placeholder="Search by college, code, place or tier" />
          </div>
          <ul className="divide-y divide-gray-200 max-h-[32rem] overflow-y-auto">
            {choices.map(seat => (
              <li key={seat.id} className="px-6 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{seat.college.name}</p>
                  <p className="text-xs text-gray-500">
                    {seat.college.code} · {seat.college.location}{seat.college.district ? `, ${seat.college.district}` : ''} · {seat.college.tier}
                  </p>
                  <p className="text-xs text-gray-500">{seat.totalSeats - seat.filledSeats} of {seat.totalSeats} seat(s) vacant</p>
                </div>
                <button
                  onClick={() => setSelected(prev => [...prev, seat])}
                  disabled={!editable}
                  className="btn-secondary px-2 py-1 text-xs"
                >
                  <HiPlus className="w-4 h-4 mr-1" /> Add
                </button>
              </li>
            ))}
            {choices.length === 0 && (
              <li className="px-6 py-8 text-center text-sm text-gray-500">
                {available.length ? 'Every matching seat is already in your list.' : 'No seats match your specialization.'}
              </li>
            )}
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default OptionEntry;
