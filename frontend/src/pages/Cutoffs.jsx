import { useEffect, useMemo, useState } from 'react';
import PublicLayout from '../components/PublicLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../api/axios';

const matches = (query, ...values) => {
  const q = query.trim().toLowerCase();
  return !q || values.some(v => v?.toLowerCase().includes(q));
};

const Cutoffs = () => {
  const [matrix, setMatrix] = useState(null);
  const [cutoffs, setCutoffs] = useState(null);
  const [tab, setTab] = useState('cutoffs');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    Promise.all([api.get('/public/seat-matrix'), api.get('/public/cutoffs')])
      .then(([m, c]) => { setMatrix(m.data); setCutoffs(c.data); })
      .catch(() => { setMatrix({ seats: [], categories: [] }); setCutoffs({ rounds: [], cutoffs: [], categories: [] }); });
  }, []);

  const categories = matrix?.categories || [];
  const label = (key) => categories.find(c => c.key === key)?.label || key;

  // One row per college/department/category, one column per round.
  const cutoffRows = useMemo(() => {
    if (!cutoffs) return [];
    const rows = new Map();
    for (const c of cutoffs.cutoffs) {
      if (category !== 'all' && c.category !== category) continue;
      if (!matches(search, c.college.name, c.college.code, c.department)) continue;
      const key = `${c.seatId}|${c.category}`;
      const row = rows.get(key) || { key, college: c.college, department: c.department, category: c.category, byRound: {} };
      row.byRound[c.roundId] = c;
      rows.set(key, row);
    }
    return [...rows.values()];
  }, [cutoffs, search, category]);

  if (!matrix || !cutoffs) return <PublicLayout><LoadingSpinner /></PublicLayout>;

  const seats = matrix.seats.filter(s => matches(search, s.college.name, s.college.code, s.department));
  const visibleCategories = category === 'all' ? categories : categories.filter(c => c.key === category);

  return (
    <PublicLayout>
      <h1 className="text-2xl font-bold text-gray-900">Seat Matrix &amp; Cutoffs</h1>
      <p className="mt-1 text-sm text-gray-500">
        Seats offered in each college department, and the opening and closing merit ranks allotted in each round.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {[['cutoffs', 'Closing ranks'], ['matrix', 'Seat matrix']].map(([key, text]) => (
            <button key={key} onClick={() => setTab(key)} className={`px-3 py-1.5 text-sm rounded-md ${tab === key ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-600'}`}>
              {text}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[12rem]">
          <input value={search} onChange={e => setSearch(e.target.value)} className="input-field mt-0" placeholder="Search college or department" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)} className="input-field mt-0 w-auto">
          <option value="all">All categories</option>
          {categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>

      <div className="mt-4 bg-white shadow sm:rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {tab === 'cutoffs' ? (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">College</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  {cutoffs.rounds.map(r => (
                    <th key={r.id} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{r.label}<br /><span className="normal-case font-normal">opening – closing</span></th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cutoffRows.map(row => (
                  <tr key={row.key}>
                    <td className="px-4 py-3 text-gray-900">{row.college.name} <span className="text-gray-500">({row.college.code})</span></td>
                    <td className="px-4 py-3 text-gray-700">{row.department}</td>
                    <td className="px-4 py-3 text-gray-700">{label(row.category)}</td>
                    {cutoffs.rounds.map(r => {
                      const c = row.byRound[r.id];
                      return (
                        <td key={r.id} className="px-4 py-3 text-right tabular-nums text-gray-900 whitespace-nowrap">
                          {c ? <>{c.openingRank} – <strong>{c.closingRank}</strong></> : <span className="text-gray-400">–</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {cutoffRows.length === 0 && (
                  <tr><td colSpan={3 + cutoffs.rounds.length} className="px-4 py-6 text-center text-gray-500">
                    {cutoffs.rounds.length ? 'No allotments match your filters.' : 'No round results have been published yet.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">College</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                  {visibleCategories.map(c => (
                    <th key={c.key} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{c.label}</th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vacant / Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {seats.map(s => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 text-gray-900">{s.college.name} <span className="text-gray-500">({s.college.code})</span></td>
                    <td className="px-4 py-3 text-gray-700">{s.college.tier}</td>
                    <td className="px-4 py-3 text-gray-700">{s.department}</td>
                    {visibleCategories.map(c => (
                      <td key={c.key} className="px-4 py-3 text-right tabular-nums text-gray-700">{s.categorySeats[c.key] || '–'}</td>
                    ))}
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900">{s.totalSeats - s.filledSeats} / {s.totalSeats}</td>
                  </tr>
                ))}
                {seats.length === 0 && (
                  <tr><td colSpan={4 + visibleCategories.length} className="px-4 py-6 text-center text-gray-500">No seats match your search.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PublicLayout>
  );
};

export default Cutoffs;
