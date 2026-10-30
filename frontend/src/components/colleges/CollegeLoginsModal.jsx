import { useState } from 'react';
import Modal from '../Modal';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';

// Logins that let a college confirm when allotted faculty report for duty.
const CollegeLoginsModal = ({ college, accounts, onClose, onChange }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [saving, setSaving] = useState(false);
  if (!college) return null;
  const mine = accounts.filter(a => a.collegeId === college.id);

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/admin/colleges/${college.id}/accounts`, form);
      toast.success('College login created');
      setForm({ name: '', email: '', password: '' });
      onChange();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create login');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (account) => {
    if (!window.confirm(`Remove login ${account.email}?`)) return;
    try {
      await api.delete(`/admin/college-accounts/${account.id}`);
      toast.success('Login removed');
      onChange();
    } catch (error) {
      toast.error('Failed to remove login');
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Logins for ${college.name}`}>
      <div className="space-y-4 text-sm">
        <ul className="divide-y border rounded-md">
          {mine.map(a => (
            <li key={a.id} className="px-3 py-2 flex items-center justify-between">
              <span><span className="text-gray-900">{a.name}</span> <span className="text-gray-500">{a.email}</span></span>
              <button onClick={() => remove(a)} className="text-red-600 hover:text-red-800 text-xs">Remove</button>
            </li>
          ))}
          {mine.length === 0 && <li className="px-3 py-3 text-gray-500">No logins yet.</li>}
        </ul>
        <form onSubmit={create} className="space-y-3">
          <h4 className="font-medium text-gray-900">Add a login</h4>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Name (e.g. Admissions office)" />
          <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="Email" />
          <input type="password" required minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="input-field" placeholder="Temporary password (min 6)" />
          <p className="text-xs text-gray-500">Share the password with the college; they can change it with "Forgot password".</p>
          <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? 'Creating...' : 'Create login'}</button>
        </form>
      </div>
    </Modal>
  );
};

export default CollegeLoginsModal;
