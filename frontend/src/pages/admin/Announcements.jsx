import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';

const AUDIENCE_LABELS = { all: 'Everyone', faculty: 'Faculty', college: 'Colleges' };
const EMPTY = { title: '', body: '', audience: 'all', pinned: false };

const Announcements = () => {
  const [items, setItems] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/admin/announcements').then(res => setItems(res.data)).catch(() => toast.error('Failed to load announcements'));

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) await api.put(`/admin/announcements/${editingId}`, form);
      else await api.post('/admin/announcements', form);
      toast.success(editingId ? 'Announcement updated' : 'Announcement posted');
      setForm(EMPTY);
      setEditingId(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const edit = (a) => {
    setEditingId(a.id);
    setForm({ title: a.title, body: a.body, audience: a.audience, pinned: a.pinned });
  };

  const remove = async (a) => {
    if (!window.confirm(`Delete "${a.title}"?`)) return;
    try {
      await api.delete(`/admin/announcements/${a.id}`);
      toast.success('Announcement deleted');
      load();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        <p className="mt-1 text-sm text-gray-500">Posts appear on the faculty and college dashboards.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="bg-white shadow sm:rounded-lg p-6 space-y-4 h-fit">
          <h3 className="text-lg font-medium text-gray-900">{editingId ? 'Edit announcement' : 'New announcement'}</h3>
          <div>
            <label className="label-text">Title</label>
            <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="label-text">Message</label>
            <textarea required rows={5} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="label-text">Show to</label>
            <select value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })} className="input-field">
              {Object.entries(AUDIENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-900">
            <input type="checkbox" checked={form.pinned} onChange={e => setForm({ ...form, pinned: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
            Pin to the top
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : editingId ? 'Save changes' : 'Post'}</button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY); }} className="btn-secondary">Cancel</button>}
          </div>
        </form>

        <div className="lg:col-span-2 bg-white shadow sm:rounded-lg overflow-hidden">
          {!items ? <div className="p-6"><LoadingSpinner /></div> : (
            <ul className="divide-y divide-gray-200">
              {items.map(a => (
                <li key={a.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {a.pinned && <span className="px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-800">Pinned</span>}
                        <h4 className="text-sm font-semibold text-gray-900">{a.title}</h4>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{AUDIENCE_LABELS[a.audience]} · {new Date(a.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-3 text-sm">
                      <button onClick={() => edit(a)} className="text-brand-600 hover:text-brand-800">Edit</button>
                      <button onClick={() => remove(a)} className="text-red-600 hover:text-red-800">Delete</button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">{a.body}</p>
                </li>
              ))}
              {items.length === 0 && <li className="px-6 py-8 text-center text-sm text-gray-500">No announcements yet.</li>}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Announcements;
