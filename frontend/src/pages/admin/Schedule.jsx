import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const PHASE_HELP = {
  registration: 'Faculty can register, edit their profile and upload documents.',
  verification: 'Admin reviews documents; faculty can re-upload rejected ones.',
  option_entry: 'Verified faculty add, remove and reorder their college/department options.',
  results: 'Allotment results become visible to faculty from the start date.',
  choices: 'Faculty exercise Choice 1-4 on their allotment.'
};

// datetime-local wants "YYYY-MM-DDTHH:mm" in local time.
const toInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const Schedule = () => {
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/admin/schedule');
      setPhases(res.data.map(p => ({ ...p, startAt: toInput(p.startAt), endAt: toInput(p.endAt) })));
    } catch (error) {
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const update = (phase, field, value) => {
    setPhases(prev => prev.map(p => (p.phase === phase ? { ...p, [field]: value } : p)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/admin/schedule', {
        phases: phases.map(p => ({
          phase: p.phase,
          startAt: p.startAt ? new Date(p.startAt).toISOString() : null,
          endAt: p.endAt ? new Date(p.endAt).toISOString() : null
        }))
      });
      toast.success('Schedule saved');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Counselling Schedule</h1>
          <p className="mt-1 text-sm text-gray-500">
            Pages open and lock automatically by these dates. A phase with no dates is always open.
            Update the dates before each round.
          </p>
        </div>
        <button onClick={handleSave} disabled={saving || loading} className="mt-4 sm:mt-0 btn-primary">
          {saving ? 'Saving...' : 'Save Schedule'}
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white shadow sm:rounded-lg divide-y divide-gray-200">
          {phases.map(p => (
            <div key={p.phase} className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">{p.label}</h3>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${p.isOpen ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                    {p.isOpen ? 'Open now' : 'Closed'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{PHASE_HELP[p.phase]}</p>
              </div>
              <div>
                <label className="label-text">Opens</label>
                <input type="datetime-local" value={p.startAt} onChange={e => update(p.phase, 'startAt', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="label-text">Closes</label>
                <input type="datetime-local" value={p.endAt} onChange={e => update(p.phase, 'endAt', e.target.value)} className="input-field" />
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
};

export default Schedule;
