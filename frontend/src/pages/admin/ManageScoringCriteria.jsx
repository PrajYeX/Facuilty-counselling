import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Modal from '../../components/Modal';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import { HiPlus, HiPencil, HiTrash } from 'react-icons/hi2';

const ManageScoringCriteria = () => {
  const [criteria, setCriteria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    field: 'qualifications.highestDegree',
    condition: 'eq',
    value: '',
    points: ''
  });

  const fetchCriteria = async () => {
    try {
      const res = await api.get('/admin/scoring-criteria');
      setCriteria(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load scoring criteria');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCriteria();
  }, []);

  const handleOpenModal = (criterion = null) => {
    if (criterion) {
      const op = typeof criterion.condition === 'object' && criterion.condition !== null 
        ? criterion.condition.operator 
        : criterion.condition || 'eq';
      const val = typeof criterion.condition === 'object' && criterion.condition !== null 
        ? (Array.isArray(criterion.condition.value) ? criterion.condition.value.join(', ') : criterion.condition.value)
        : (criterion.value !== undefined ? criterion.value : '');

      setEditingId(criterion._id || criterion.id);
      setFormData({
        name: criterion.name,
        description: criterion.description || '',
        field: criterion.field,
        condition: op,
        value: val,
        points: criterion.points
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '', description: '', field: 'qualifications.highestDegree', condition: 'eq', value: '', points: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/admin/scoring-criteria/${editingId}`, formData);
        toast.success('Criterion updated');
      } else {
        await api.post('/admin/scoring-criteria', formData);
        toast.success('Criterion added');
      }
      setIsModalOpen(false);
      fetchCriteria();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this scoring criterion?')) {
      try {
        await api.delete(`/admin/scoring-criteria/${id}`);
        toast.success('Criterion deleted');
        fetchCriteria();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete');
      }
    }
  };

  const totalPossiblePoints = criteria.reduce((sum, item) => sum + (Number(item.points) || 0), 0);

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Scoring Criteria</h1>
          <p className="mt-1 text-sm text-gray-500">Configure how faculty are scored for the merit list.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <HiPlus className="w-5 h-5 mr-1" /> Add Criterion
        </button>
      </div>

      <div className="mb-4 bg-brand-50 border border-brand-200 text-brand-800 px-4 py-3 rounded-md">
        <strong>Total Max Points Configured: </strong> {totalPossiblePoints}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Field</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rule</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Points</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {criteria.map((c) => {
                const itemKey = c._id || c.id;
                const isObjCond = typeof c.condition === 'object' && c.condition !== null;
                const op = isObjCond ? c.condition.operator : c.condition;
                const val = isObjCond 
                  ? (Array.isArray(c.condition.value) ? c.condition.value.join(', ') : String(c.condition.value))
                  : String(c.value !== undefined ? c.value : '');

                return (
                  <tr key={itemKey} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500">{c.description}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono text-xs">{c.field}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <span className="uppercase text-xs font-semibold px-2 py-0.5 bg-gray-100 rounded mr-1">
                        {op}
                      </span>{' '}
                      <span className="font-semibold">{val}</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-brand-600">+{c.points}</td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <button onClick={() => handleOpenModal(c)} className="text-brand-600 hover:text-brand-900 mr-4">
                        <HiPencil className="w-5 h-5 inline" />
                      </button>
                      <button onClick={() => handleDelete(itemKey)} className="text-red-600 hover:text-red-900">
                        <HiTrash className="w-5 h-5 inline" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {criteria.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                    No criteria defined.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Criterion' : 'Add Criterion'}>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="label-text">Name</label>
            <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="input-field" placeholder="e.g. PhD Bonus" />
          </div>
          <div>
            <label className="label-text">Description</label>
            <input type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="input-field" />
          </div>
          <div>
            <label className="label-text">Field to check</label>
            <select value={formData.field} onChange={(e) => setFormData({...formData, field: e.target.value})} className="input-field">
              <option value="qualifications.highestDegree">Highest Degree</option>
              <option value="qualifications.yearsOfExperience">Years of Experience</option>
              <option value="qualifications.netSetQualified">NET/SET Qualified</option>
              <option value="qualifications.researchPapers">Research Papers</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Condition</label>
              <select value={formData.condition} onChange={(e) => setFormData({...formData, condition: e.target.value})} className="input-field">
                <option value="eq">Equals (eq)</option>
                <option value="gte">Greater or Equal (gte)</option>
                <option value="gt">Greater Than (gt)</option>
                <option value="lte">Less or Equal (lte)</option>
                <option value="lt">Less Than (lt)</option>
              </select>
            </div>
            <div>
              <label className="label-text">Value</label>
              <input type="text" required value={formData.value} onChange={(e) => setFormData({...formData, value: e.target.value})} className="input-field" placeholder="e.g. PhD, true, 5" />
            </div>
          </div>
          <div>
            <label className="label-text">Points Awarded</label>
            <input type="number" required value={formData.points} onChange={(e) => setFormData({...formData, points: e.target.value})} className="input-field" />
          </div>
          
          <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
            <button type="submit" className="w-full inline-flex justify-center btn-primary sm:col-start-2">Save</button>
            <button type="button" onClick={() => setIsModalOpen(false)} className="mt-3 w-full inline-flex justify-center btn-secondary sm:mt-0 sm:col-start-1">Cancel</button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};

export default ManageScoringCriteria;
