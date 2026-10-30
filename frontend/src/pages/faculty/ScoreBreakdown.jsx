import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import { HiCheckCircle, HiMinusCircle } from 'react-icons/hi2';

const ScoreBreakdown = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/faculty/my-score')
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load score breakdown'));
  }, []);

  if (!data) return <Layout><LoadingSpinner /></Layout>;

  const possible = data.breakdown.reduce((sum, b) => sum + b.pointsPossible, 0);
  const differs = data.calculatedScore !== data.totalScore;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Score Breakdown</h1>
        <p className="mt-1 text-sm text-gray-500">How each scoring rule applies to the qualifications on your profile.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mb-6">
        <div className="bg-white shadow sm:rounded-lg p-5">
          <p className="text-sm text-gray-500">Official merit score</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{data.totalScore}</p>
          <p className="text-xs text-gray-500 mt-1">Used for your rank</p>
        </div>
        <div className="bg-white shadow sm:rounded-lg p-5">
          <p className="text-sm text-gray-500">Based on your current profile</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{data.calculatedScore}<span className="text-base font-normal text-gray-500"> / {possible}</span></p>
          <p className="text-xs text-gray-500 mt-1">Points from the rules you currently meet, out of the maximum</p>
        </div>
      </div>

      {differs && (
        <div className="mb-6 max-w-3xl p-3 rounded-md border border-blue-200 bg-blue-50 text-sm text-blue-800">
          Your official score is updated when the counselling authority recalculates scores after verification.
          Only verified details count. <Link to="/faculty/profile" className="underline">Check your profile</Link>.
        </div>
      )}

      <div className="bg-white shadow sm:rounded-lg overflow-hidden max-w-3xl">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rule</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Met?</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.breakdown.map(b => (
              <tr key={b.criteria}>
                <td className="px-6 py-4 text-sm text-gray-900">{b.criteria}</td>
                <td className="px-6 py-4 text-sm">
                  {b.metCondition
                    ? <span className="inline-flex items-center gap-1 text-green-700"><HiCheckCircle className="w-5 h-5" /> Yes</span>
                    : <span className="inline-flex items-center gap-1 text-gray-500"><HiMinusCircle className="w-5 h-5" /> No</span>}
                </td>
                <td className="px-6 py-4 text-sm text-right tabular-nums">
                  <span className={b.metCondition ? 'font-semibold text-gray-900' : 'text-gray-400'}>{b.pointsEarned}</span>
                  <span className="text-gray-400"> / {b.pointsPossible}</span>
                </td>
              </tr>
            ))}
            {data.breakdown.length === 0 && (
              <tr><td colSpan="3" className="px-6 py-6 text-center text-sm text-gray-500">No scoring rules are active yet.</td></tr>
            )}
          </tbody>
          {data.breakdown.length > 0 && (
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-6 py-3 text-sm font-semibold text-gray-900" colSpan="2">Total</td>
                <td className="px-6 py-3 text-sm text-right font-semibold tabular-nums text-gray-900">{data.calculatedScore} / {possible}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Layout>
  );
};

export default ScoreBreakdown;
