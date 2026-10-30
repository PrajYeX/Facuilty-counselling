import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import StatCard from '../../components/StatCard';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import { 
  HiOutlineUsers, 
  HiOutlineCheckBadge, 
  HiOutlineClock, 
  HiOutlineXCircle,
  HiOutlineAcademicCap,
  HiOutlineTicket
} from 'react-icons/hi2';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/dashboard-stats');
        setStats(res.data);
      } catch (error) {
        toast.error('Failed to load dashboard stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Overview of system statistics and quick actions.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard 
            title="Total Faculty" 
            value={stats.totalFaculty} 
            icon={HiOutlineUsers} 
            colorClass="text-blue-600"
            bgClass="bg-blue-100"
          />
          <StatCard 
            title="Verified Faculty" 
            value={stats.verifiedFaculty} 
            icon={HiOutlineCheckBadge} 
            colorClass="text-green-600"
            bgClass="bg-green-100"
          />
          <StatCard 
            title="Pending Verification" 
            value={stats.pendingFaculty} 
            icon={HiOutlineClock} 
            colorClass="text-yellow-600"
            bgClass="bg-yellow-100"
          />
          <StatCard 
            title="Total Colleges" 
            value={stats.totalColleges} 
            icon={HiOutlineAcademicCap} 
            colorClass="text-indigo-600"
            bgClass="bg-indigo-100"
          />
          <StatCard 
            title="Rejected Faculty" 
            value={stats.rejectedFaculty} 
            icon={HiOutlineXCircle} 
            colorClass="text-red-600"
            bgClass="bg-red-100"
          />
          <StatCard 
            title="Total Allotted" 
            value={stats.totalAllotted} 
            icon={HiOutlineTicket} 
            colorClass="text-teal-600"
            bgClass="bg-teal-100"
          />
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => navigate('/admin/verify-faculty')}
            className="flex items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <HiOutlineCheckBadge className="w-6 h-6 text-brand-600 mr-2" />
            <span className="font-medium text-gray-700">Verify Faculty Docs</span>
          </button>
          
          <button 
            onClick={() => navigate('/admin/merit-list')}
            className="flex items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <HiOutlineUsers className="w-6 h-6 text-brand-600 mr-2" />
            <span className="font-medium text-gray-700">View Merit List</span>
          </button>
          
          <button 
            onClick={() => navigate('/admin/allotment')}
            className="flex items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <HiOutlineTicket className="w-6 h-6 text-brand-600 mr-2" />
            <span className="font-medium text-gray-700">Manage Allotments</span>
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
