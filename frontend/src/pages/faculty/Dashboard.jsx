import { useContext, useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { AuthContext } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import AnnouncementsBoard from '../../components/AnnouncementsBoard';
import EmailVerifyBanner from '../../components/EmailVerifyBanner';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [allotment, setAllotment] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, allotmentRes] = await Promise.all([
          api.get('/auth/me').catch(() => ({ data: null })),
          api.get('/faculty/allotment-status').catch(() => ({ data: null }))
        ]);
        if (profileRes.data) {
          setProfile(profileRes.data);
        }
        const current = allotmentRes.data?.current;
        setAllotment(current && ['allotted', 'accepted', 'upgrade'].includes(current.status) ? current : null);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, []);

  const getStatusColor = (status) => {
    if (status === 'verified') return 'text-green-700 bg-green-100 border-green-200';
    if (status === 'rejected') return 'text-red-700 bg-red-100 border-red-200';
    return 'text-yellow-700 bg-yellow-100 border-yellow-200';
  };

  const isAllotted = Boolean(allotment && allotment.college);

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name}</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your profile and track your counselling progress.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className={`p-4 rounded-lg border ${profile ? getStatusColor(profile.verificationStatus) : 'bg-gray-50'}`}>
          <h3 className="text-sm font-medium uppercase tracking-wider opacity-80">Verification Status</h3>
          <p className="mt-2 text-2xl font-bold capitalize">{profile?.verificationStatus || 'Pending'}</p>
        </div>
        
        <div className="p-4 rounded-lg border border-brand-200 bg-brand-50 text-brand-800">
          <h3 className="text-sm font-medium uppercase tracking-wider opacity-80">Total Score</h3>
          <p className="mt-2 text-2xl font-bold">{profile?.totalScore || 0}</p>
        </div>

        <div className="p-4 rounded-lg border border-purple-200 bg-purple-50 text-purple-800">
          <h3 className="text-sm font-medium uppercase tracking-wider opacity-80">Rank</h3>
          <p className="mt-2 text-2xl font-bold">{profile?.rank ? `#${profile.rank}` : 'Not Assigned'}</p>
        </div>

        <div className={`p-4 rounded-lg border ${isAllotted ? 'border-teal-200 bg-teal-50 text-teal-800' : 'border-gray-200 bg-gray-50 text-gray-800'}`}>
          <h3 className="text-sm font-medium uppercase tracking-wider opacity-80">Allotment</h3>
          <p className="mt-2 text-2xl font-bold truncate">{isAllotted ? 'Allotted' : 'Pending'}</p>
        </div>
      </div>

      {profile && !profile.emailVerified && <EmailVerifyBanner email={profile.email} />}

      <AnnouncementsBoard />

      {profile?.documents?.some(d => d.status === 'rejected') && (
        <div className="mb-8 p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800">
          Some of your documents were rejected.{' '}
          <Link to="/faculty/upload-documents" className="font-medium underline">See the reasons and re-upload</Link>.
        </div>
      )}

      {isAllotted && (
        <div className="bg-white rounded-lg shadow border border-teal-100 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Congratulations! You have been allotted a college.</h2>
          {allotment.status === 'allotted' && (
            <p className="mb-4 text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 rounded p-2">
              Exercise your post-allotment choice, or the seat will lapse.
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">College Name</p>
              <p className="font-medium text-lg">{allotment?.college?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Department</p>
              <p className="font-medium">{allotment?.department}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link to="/faculty/allotment-status" className="text-brand-600 hover:text-brand-800 font-medium text-sm">
              View details and choices &rarr;
            </Link>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Next Steps</h3>
        </div>
        <div className="p-6">
          <ul className="space-y-4">
            <li className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 rounded-full bg-brand-100 flex items-center justify-center border border-brand-300">
                <span className="text-sm text-brand-600 font-medium">1</span>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-gray-900">Complete Profile</h4>
                <p className="text-sm text-gray-500 mt-1">Ensure your qualifications and experience are up to date.</p>
                <Link to="/faculty/profile" className="text-sm text-brand-600 mt-1 inline-block">Go to Profile</Link>
              </div>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 rounded-full bg-brand-100 flex items-center justify-center border border-brand-300">
                <span className="text-sm text-brand-600 font-medium">2</span>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-gray-900">Upload Documents</h4>
                <p className="text-sm text-gray-500 mt-1">Upload necessary proofs for your qualifications.</p>
                <Link to="/faculty/upload-documents" className="text-sm text-brand-600 mt-1 inline-block">Upload Docs</Link>
              </div>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 rounded-full bg-brand-100 flex items-center justify-center border border-brand-300">
                <span className="text-sm text-brand-600 font-medium">3</span>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-gray-900">Await Verification</h4>
                <p className="text-sm text-gray-500 mt-1">Admin reviews each document. If one is rejected you will see why and can re-upload it.</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 rounded-full bg-brand-100 flex items-center justify-center border border-brand-300">
                <span className="text-sm text-brand-600 font-medium">4</span>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-gray-900">Enter Options</h4>
                <p className="text-sm text-gray-500 mt-1">Once verified, list colleges in your department in order of preference.</p>
                <Link to="/faculty/options" className="text-sm text-brand-600 mt-1 inline-block">Go to Option Entry</Link>
              </div>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 rounded-full bg-brand-100 flex items-center justify-center border border-brand-300">
                <span className="text-sm text-brand-600 font-medium">5</span>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-gray-900">Check Results &amp; Choose</h4>
                <p className="text-sm text-gray-500 mt-1">After each round, accept, upgrade, reject or quit, and download your allotment order.</p>
                <Link to="/faculty/allotment-status" className="text-sm text-brand-600 mt-1 inline-block">Allotment Status</Link>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
