import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Modal from '../../components/Modal';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import CategoriesPanel from '../../components/colleges/CategoriesPanel';
import ImportCollegesModal from '../../components/colleges/ImportCollegesModal';
import CollegeLoginsModal from '../../components/colleges/CollegeLoginsModal';
import { HiPlus, HiPencil, HiTrash, HiArrowUpTray, HiOutlineKey } from 'react-icons/hi2';

const emptySeat = () => ({ department: '', categorySeats: {} });
const emptyForm = () => ({ name: '', code: '', tier: 'Tier 3', location: '', district: '', seats: [emptySeat()] });

const ManageColleges = () => {
  const [colleges, setColleges] = useState([]);
  const [categories, setCategories] = useState([{ key: 'GEN', label: 'General' }]);
  const [departments, setDepartments] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [loginsFor, setLoginsFor] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm());

  const fetchColleges = async () => {
    try {
      const [res, deptRes, catRes, accRes] = await Promise.all([
        api.get('/admin/colleges'),
        api.get('/admin/departments'),
        api.get('/admin/categories'),
        api.get('/admin/college-accounts')
      ]);
      setColleges(res.data);
      setDepartments(deptRes.data);
      setCategories(catRes.data);
      setAccounts(accRes.data);
    } catch (error) {
      toast.error('Failed to load colleges');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColleges();
  }, []);

  const label = (key) => categories.find(c => c.key === key)?.label || key;

  const handleOpenModal = (college = null) => {
    if (college) {
      setEditingId(college._id);
      setFormData({
        name: college.name,
        code: college.code,
        tier: college.tier,
        location: college.location,
        district: college.district,
        seats: college.seats?.length
          ? college.seats.map(s => ({ department: s.department, categorySeats: { ...s.categorySeats }, filledByCategory: s.filledByCategory }))
          : [emptySeat()]
      });
    } else {
      setEditingId(null);
      setFormData(emptyForm());
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      seats: formData.seats
        .filter(s => s.department.trim())
        .map(s => ({
          department: s.department.trim(),
          categorySeats: Object.fromEntries(Object.entries(s.categorySeats).map(([k, v]) => [k, Number(v) || 0]))
        }))
    };

    try {
      if (editingId) {
        await api.put(`/admin/colleges/${editingId}`, payload);
        toast.success('College updated successfully');
      } else {
        await api.post('/admin/colleges', payload);
        toast.success('College added successfully');
      }
      setIsModalOpen(false);
      fetchColleges();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this college?')) {
      try {
        await api.delete(`/admin/colleges/${id}`);
        toast.success('College deleted successfully');
        fetchColleges();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete');
      }
    }
  };

  const updateSeat = (index, changes) => {
    setFormData(prev => ({
      ...prev,
      seats: prev.seats.map((s, i) => (i === index ? { ...s, ...changes } : s))
    }));
  };

  const addSeatRow = () => {
    setFormData(prev => ({ ...prev, seats: [...prev.seats, emptySeat()] }));
  };

  const removeSeatRow = (index) => {
    setFormData(prev => ({ ...prev, seats: prev.seats.filter((_, i) => i !== index) }));
  };

  const getTierColor = (tier) => {
    if (tier === 'Tier 1') return 'bg-green-100 text-green-800';
    if (tier === 'Tier 2') return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Colleges</h1>
          <p className="mt-1 text-sm text-gray-500">Add, edit, or remove participating colleges and their seats.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsImportOpen(true)} className="btn-secondary">
            <HiArrowUpTray className="w-5 h-5 mr-1" /> Import CSV / Excel
          </button>
          <button onClick={() => handleOpenModal()} className="btn-primary">
            <HiPlus className="w-5 h-5 mr-1" /> Add College
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">College</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department Seats (Filled/Total)</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {colleges.map((college) => {
                    const logins = accounts.filter(a => a.collegeId === college.id).length;
                    return (
                      <tr key={college._id} className="hover:bg-gray-50 align-top">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{college.name}</div>
                          <div className="text-xs text-gray-500">{college.code}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTierColor(college.tier)}`}>
                            {college.tier}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {[college.location, college.district].filter(Boolean).join(', ')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {college.seats?.length ? (
                            <div className="flex flex-wrap gap-1">
                              {college.seats.map(s => (
                                <span
                                  key={s.id}
                                  className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs whitespace-nowrap"
                                  title={Object.entries(s.categorySeats).map(([k, n]) => `${label(k)}: ${s.filledByCategory[k] || 0}/${n}`).join('\n')}
                                >
                                  {s.department}: {s.filledSeats}/{s.totalSeats}
                                  {Object.keys(s.categorySeats).length > 1 && <span className="text-gray-400"> ({Object.entries(s.categorySeats).map(([k, n]) => `${k} ${n}`).join(', ')})</span>}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-red-600">No seats</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button onClick={() => setLoginsFor(college)} className="text-gray-600 hover:text-gray-900 mr-4" title="College logins">
                            <HiOutlineKey className="w-5 h-5 inline" /> <span className="text-xs">{logins}</span>
                          </button>
                          <button onClick={() => handleOpenModal(college)} className="text-brand-600 hover:text-brand-900 mr-4" title="Edit">
                            <HiPencil className="w-5 h-5 inline" />
                          </button>
                          <button onClick={() => handleDelete(college._id)} className="text-red-600 hover:text-red-900" title="Delete">
                            <HiTrash className="w-5 h-5 inline" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {colleges.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                        No colleges found. Add some or import a file to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <CategoriesPanel categories={categories} onChange={setCategories} />
        </>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit College' : 'Add College'}>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="label-text">College Name</label>
            <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Code</label>
              <input type="text" required value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="label-text">Tier</label>
              <select value={formData.tier} onChange={(e) => setFormData({...formData, tier: e.target.value})} className="input-field">
                <option value="Tier 1">Tier 1</option>
                <option value="Tier 2">Tier 2</option>
                <option value="Tier 3">Tier 3</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Location (City)</label>
              <input type="text" required value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="label-text">District</label>
              <input type="text" required value={formData.district} onChange={(e) => setFormData({...formData, district: e.target.value})} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label-text">Vacancies per department</label>
            <p className="text-xs text-gray-500 mb-2">
              Faculty can only opt for a department that matches their specialization, so use consistent names.
            </p>
            <datalist id="department-names">
              {departments.map(d => <option key={d} value={d} />)}
            </datalist>
            <div className="space-y-3">
              {formData.seats.map((seat, index) => (
                <div key={index} className="border rounded-md p-3 space-y-2">
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      list="department-names"
                      value={seat.department}
                      onChange={(e) => updateSeat(index, { department: e.target.value })}
                      className="input-field mt-0 flex-1"
                      placeholder="Department, e.g. Computer Science"
                    />
                    <button type="button" onClick={() => removeSeatRow(index)} className="text-red-600 hover:text-red-900" title="Remove department">
                      <HiTrash className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {categories.map(c => (
                      <label key={c.key} className="text-xs text-gray-600">
                        {c.label}
                        <input
                          type="number"
                          min={seat.filledByCategory?.[c.key] || 0}
                          value={seat.categorySeats[c.key] ?? ''}
                          onChange={(e) => updateSeat(index, { categorySeats: { ...seat.categorySeats, [c.key]: e.target.value } })}
                          className="input-field mt-0.5"
                          placeholder="0"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addSeatRow} className="mt-2 text-sm text-brand-600 hover:text-brand-800 font-medium">
              + Add department
            </button>
          </div>
          <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
            <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-brand-600 text-base font-medium text-white hover:bg-brand-700 sm:col-start-2 sm:text-sm">
              Save
            </button>
            <button type="button" onClick={() => setIsModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:col-start-1 sm:text-sm">
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <ImportCollegesModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onImported={fetchColleges} />
      <CollegeLoginsModal college={loginsFor} accounts={accounts} onClose={() => setLoginsFor(null)} onChange={fetchColleges} />
    </Layout>
  );
};

export default ManageColleges;
