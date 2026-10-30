import { useState } from 'react';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import { HiTrash } from 'react-icons/hi2';

// Reservation categories. General (GEN) always exists and cannot be removed.
const CategoriesPanel = ({ categories, onChange }) => {
  const [draft, setDraft] = useState({ key: '', label: '' });
  const custom = categories.filter(c => c.key !== 'GEN');

  const save = async (next) => {
    try {
      const res = await api.put('/admin/categories', { categories: next });
      toast.success('Categories saved');
      onChange(res.data);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save categories');
      return false;
    }
  };

  const add = async (e) => {
    e.preventDefault();
    if (await save([...custom, draft])) setDraft({ key: '', label: '' });
  };

  return (
    <div className="bg-white shadow sm:rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900">Reservation categories</h3>
      <p className="mt-1 text-sm text-gray-500">
        Each department's seats can be split into these quotas. Faculty compete for General seats on merit first, then for their own category's seats.
        Unfilled reserved seats become General in the extended round.
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {categories.map(c => (
          <li key={c.key} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-sm">
            <code className="text-xs text-gray-500">{c.key}</code>
            <span className="text-gray-900">{c.label}</span>
            {c.key !== 'GEN' && (
              <button onClick={() => save(custom.filter(x => x.key !== c.key))} className="text-gray-400 hover:text-red-600" title={`Remove ${c.label}`}>
                <HiTrash className="w-4 h-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="mt-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="label-text">Code</label>
          <input required value={draft.key} onChange={e => setDraft({ ...draft, key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })} className="input-field w-28" placeholder="WOMEN" />
        </div>
        <div className="flex-1 min-w-[10rem]">
          <label className="label-text">Name</label>
          <input required value={draft.label} onChange={e => setDraft({ ...draft, label: e.target.value })} className="input-field" placeholder="Women" />
        </div>
        <button type="submit" className="btn-secondary">Add category</button>
      </form>
    </div>
  );
};

export default CategoriesPanel;
