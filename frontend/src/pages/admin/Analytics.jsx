import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';

const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

// One horizontal bar per row: filled share of a gray track, value written out
// beside it so the number never depends on reading the bar.
const FillBars = ({ rows }) => (
  <ul className="space-y-3">
    {rows.map(r => (
      <li key={r.key} title={`${r.label}: ${r.filled} of ${r.total} filled (${pct(r.filled, r.total)}%)`}>
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-gray-900">{r.label}</span>
          <span className="tabular-nums text-gray-600">{r.filled} / {r.total} <span className="text-gray-400">({pct(r.filled, r.total)}%)</span></span>
        </div>
        <div className="mt-1 h-2.5 rounded bg-gray-100 overflow-hidden">
          <div className="h-full rounded bg-brand-600" style={{ width: `${pct(r.filled, r.total)}%` }} />
        </div>
      </li>
    ))}
    {rows.length === 0 && <li className="text-sm text-gray-500">No seats configured.</li>}
  </ul>
);

const Card = ({ title, subtitle, children }) => (
  <div className="bg-white shadow sm:rounded-lg p-6">
    <h3 className="text-base font-semibold text-gray-900">{title}</h3>
    {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    <div className="mt-4">{children}</div>
  </div>
);

const ROUND_METRICS = [
  ['Participants', r => r.summary?.participants],
  ['Allotted', r => r.summary?.allotted],
  ['Newly allotted', r => r.summary?.newlyAllotted],
  ['Moved to a better seat', r => r.summary?.upgraded],
  ['Kept previous seat', r => r.summary?.retained],
  ['Not allotted', r => r.summary?.notAllotted],
  ['Lapsed before this round', r => r.summary?.lapsed]
];

const OUTCOME_METRICS = [
  ['Choice pending', 'allotted'],
  ['Choice 1: joined', 'accepted'],
  ['Choice 2: upgrade', 'upgrade'],
  ['Choice 3: rejected', 'rejected'],
  ['Choice 4: quit', 'quit'],
  ['No choice (lapsed)', 'lapsed'],
  ['Moved in a later round', 'superseded']
];

const Analytics = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/admin/analytics').then(res => setData(res.data)).catch(() => toast.error('Failed to load analytics'));
  }, []);

  if (!data) return <Layout><LoadingSpinner /></Layout>;

  const top = data.funnel[0]?.value || 0;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">Seat fill and applicant progress across the counselling process.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Applicant progress" subtitle="Faculty reaching each stage">
          <ul className="space-y-3">
            {data.funnel.map(f => (
              <li key={f.key} title={`${f.label}: ${f.value}`}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-gray-900">{f.label}</span>
                  <span className="tabular-nums font-medium text-gray-900">{f.value}</span>
                </div>
                <div className="mt-1 h-2.5 rounded bg-gray-100 overflow-hidden">
                  <div className="h-full rounded bg-brand-600" style={{ width: `${pct(f.value, top)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Seats filled by tier" subtitle="Currently held seats of total offered">
          <FillBars rows={data.byTier.map(t => ({ ...t, label: t.key }))} />
          {data.byCategory.length > 1 && (
            <div className="mt-8">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">By category quota</h4>
              <FillBars rows={data.byCategory} />
            </div>
          )}
        </Card>
      </div>

      <div className="mb-6">
        <Card title="Seats filled by department" subtitle="Currently held seats of total offered">
          <FillBars rows={data.byDepartment.map(d => ({ ...d, label: d.key }))} />
        </Card>
      </div>

      <Card title="Round-over-round movement" subtitle="What each round did, and what faculty chose afterwards">
        {data.rounds.length === 0 ? (
          <p className="text-sm text-gray-500">No rounds have been run yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-4 text-left font-medium text-gray-500" />
                  {data.rounds.map(r => <th key={r.id} className="py-2 px-4 text-right font-medium text-gray-900 whitespace-nowrap">{r.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {ROUND_METRICS.map(([label, get]) => (
                  <tr key={label} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-gray-700">{label}</td>
                    {data.rounds.map(r => <td key={r.id} className="py-2 px-4 text-right tabular-nums text-gray-900">{get(r) ?? '–'}</td>)}
                  </tr>
                ))}
                <tr><td colSpan={1 + data.rounds.length} className="pt-4 pb-1 text-xs font-semibold uppercase text-gray-500">Outcome of each round's allotments</td></tr>
                {OUTCOME_METRICS.map(([label, key]) => (
                  <tr key={key} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-gray-700">{label}</td>
                    {data.rounds.map(r => <td key={r.id} className="py-2 px-4 text-right tabular-nums text-gray-900">{r.outcomes[key] || 0}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Layout>
  );
};

export default Analytics;
