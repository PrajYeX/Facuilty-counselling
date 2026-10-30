import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';

const PAGE_SIZE = 50;

const AuditLog = () => {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ action: '', actor: '' });
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams({ limit: PAGE_SIZE, offset });
    if (filters.action) params.set('action', filters.action);
    if (filters.actor) params.set('actor', filters.actor);
    api.get(`/admin/audit-log?${params}`)
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load audit log'));
  }, [filters, offset]);

  const setFilter = (key, value) => {
    setOffset(0);
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="mt-1 text-sm text-gray-500">Every admin and college action, newest first. Entries cannot be edited or deleted.</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <select value={filters.action} onChange={e => setFilter('action', e.target.value)} className="input-field mt-0 w-auto">
          <option value="">All actions</option>
          {(data?.actions || []).map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <input value={filters.actor} onChange={e => setFilter('actor', e.target.value)} className="input-field mt-0 w-64" placeholder="Filter by who did it" />
      </div>

      {!data ? <LoadingSpinner /> : (
        <div className="bg-white shadow sm:rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">When</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Who</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">What happened</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.entries.map(e => (
                  <tr key={e.id} className="align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{new Date(e.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-gray-900">{e.actorName || 'System'}</div>
                      <div className="text-xs text-gray-500">{e.actorRole}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{e.action}</code></td>
                    <td className="px-4 py-3 text-gray-900">
                      {e.summary}
                      {e.details && (
                        <>
                          <button onClick={() => setExpanded(expanded === e.id ? null : e.id)} className="ml-2 text-xs text-brand-600 hover:text-brand-800">
                            {expanded === e.id ? 'Hide details' : 'Details'}
                          </button>
                          {expanded === e.id && (
                            <pre className="mt-2 text-xs bg-gray-50 border rounded p-2 overflow-x-auto max-w-2xl">{JSON.stringify(e.details, null, 2)}</pre>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {data.entries.length === 0 && (
                  <tr><td colSpan="4" className="px-4 py-6 text-center text-gray-500">No matching entries.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t flex items-center justify-between text-sm text-gray-600">
            <span>{data.total ? `${offset + 1}–${Math.min(offset + PAGE_SIZE, data.total)} of ${data.total}` : '0 entries'}</span>
            <div className="flex gap-2">
              <button onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))} disabled={offset === 0} className="btn-secondary px-3 py-1">Newer</button>
              <button onClick={() => setOffset(o => o + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= data.total} className="btn-secondary px-3 py-1">Older</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AuditLog;
