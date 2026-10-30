import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import { HiArrowUp, HiArrowDown, HiArrowDownTray } from 'react-icons/hi2';
import { downloadFile } from '../../utils/download';

const MeritList = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [tieBreakers, setTieBreakers] = useState({ order: [], available: [] });
  const [categories, setCategories] = useState([]);

  const exportList = async (format) => {
    try {
      await downloadFile(`/admin/merit-list/export?format=${format}`, `merit-list.${format}`);
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const fetchMeritList = async () => {
    try {
      const res = await api.get('/admin/merit-list');
      setList(res.data);
    } catch (error) {
      toast.error('Failed to load merit list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeritList();
    api.get('/admin/tie-breakers').then(res => setTieBreakers(res.data)).catch(() => {});
    api.get('/admin/categories').then(res => setCategories(res.data)).catch(() => {});
  }, []);

  const moveTieBreaker = (index, delta) => {
    const order = [...tieBreakers.order];
    const [item] = order.splice(index, 1);
    order.splice(index + delta, 0, item);
    setTieBreakers(prev => ({ ...prev, order }));
  };

  const toggleTieBreaker = (key) => {
    setTieBreakers(prev => ({
      ...prev,
      order: prev.order.includes(key) ? prev.order.filter(k => k !== key) : [...prev.order, key]
    }));
  };

  const saveTieBreakers = async () => {
    try {
      const res = await api.put('/admin/tie-breakers', { order: tieBreakers.order });
      setTieBreakers(prev => ({ ...prev, order: res.data.order }));
      toast.success('Tie-break order saved. Generate the merit list to apply it.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save tie-break order');
    }
  };

  const handleCalculateScores = async () => {
    setActionLoading(true);
    try {
      await api.post('/admin/calculate-scores');
      toast.success('Scores calculated successfully');
      fetchMeritList();
    } catch (error) {
      toast.error('Failed to calculate scores');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateMeritList = async () => {
    setActionLoading(true);
    try {
      await api.post('/admin/generate-merit-list');
      toast.success('Merit list generated (Ranks assigned)');
      fetchMeritList();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate merit list');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Merit List</h1>
          <p className="mt-1 text-sm text-gray-500">Calculate scores and assign ranks to verified faculty.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-wrap gap-3">
          <button onClick={() => exportList('csv')} disabled={!list.some(f => f.rank)} className="btn-secondary">
            <HiArrowDownTray className="w-4 h-4 mr-1" /> CSV
          </button>
          <button onClick={() => exportList('pdf')} disabled={!list.some(f => f.rank)} className="btn-secondary">
            <HiArrowDownTray className="w-4 h-4 mr-1" /> PDF
          </button>
          <button 
            onClick={handleCalculateScores} 
            disabled={actionLoading}
            className="btn-secondary"
          >
            Calculate Scores
          </button>
          <button 
            onClick={handleGenerateMeritList} 
            disabled={actionLoading}
            className="btn-primary"
          >
            Generate Merit List
          </button>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Tie-breaking rule</h3>
            <p className="mt-1 text-sm text-gray-500">
              When scores are equal, faculty are ordered by these rules from top to bottom, then by registration order.
            </p>
          </div>
          <button onClick={saveTieBreakers} className="btn-secondary">Save Order</button>
        </div>
        <ol className="mt-4 space-y-2 max-w-md">
          {tieBreakers.order.map((key, index) => (
            <li key={key} className="flex items-center justify-between border rounded-md px-3 py-2 text-sm">
              <span><span className="text-gray-400 mr-2">{index + 1}.</span>{tieBreakers.available.find(t => t.key === key)?.label}</span>
              <span className="flex items-center gap-2">
                <button onClick={() => moveTieBreaker(index, -1)} disabled={index === 0} className="text-gray-500 hover:text-gray-900 disabled:opacity-30"><HiArrowUp /></button>
                <button onClick={() => moveTieBreaker(index, 1)} disabled={index === tieBreakers.order.length - 1} className="text-gray-500 hover:text-gray-900 disabled:opacity-30"><HiArrowDown /></button>
                <button onClick={() => toggleTieBreaker(key)} className="text-xs text-red-600 hover:text-red-800">Remove</button>
              </span>
            </li>
          ))}
        </ol>
        {tieBreakers.available.some(t => !tieBreakers.order.includes(t.key)) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {tieBreakers.available.filter(t => !tieBreakers.order.includes(t.key)).map(t => (
              <button key={t.key} onClick={() => toggleTieBreaker(t.key)} className="text-xs px-2 py-1 rounded border border-dashed border-gray-300 text-gray-600 hover:bg-gray-50">
                + {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Faculty Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Highest Degree</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exp</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Papers</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date of Birth</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {list.map((f) => {
                const isTop3 = f.rank && f.rank <= 3;
                return (
                  <tr key={f._id} className={isTop3 ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {f.rank ? (
                        <span className={isTop3 ? 'text-yellow-600 font-bold' : 'text-gray-900'}>
                          #{f.rank}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{f.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {categories.find(c => c.key === f.category)?.label || f.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {f.qualifications?.highestDegree}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {f.qualifications?.yearsOfExperience}y
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {f.qualifications?.researchPapers}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {f.dateOfBirth || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-brand-600">
                      {f.totalScore || 0}
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                    No verified faculty found to generate merit list.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
};

export default MeritList;
