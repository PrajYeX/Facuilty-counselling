import { useState, useEffect, useContext } from 'react';
import Layout from '../../components/Layout';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import PhaseBanner from '../../components/PhaseBanner';
import useSchedule from '../../hooks/useSchedule';

const Profile = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verified, setVerified] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const schedule = useSchedule();
  
  const [formData, setFormData] = useState({
    phone: '',
    dateOfBirth: '',
    category: 'GEN',
    highestDegree: 'Other',
    specialization: '',
    yearsOfExperience: 0,
    netSetQualified: false,
    researchPapers: 0
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [res, deptRes, catRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/faculty/departments').catch(() => ({ data: [] })),
          api.get('/public/categories').catch(() => ({ data: [] }))
        ]);
        const data = res.data;
        setVerified(data.verificationStatus === 'verified');
        setDepartments(deptRes.data);
        setCategories(catRes.data);
        setFormData({
          phone: data.phone || '',
          dateOfBirth: data.dateOfBirth || '',
          category: data.category || 'GEN',
          highestDegree: data.qualifications?.highestDegree || 'Other',
          specialization: data.qualifications?.specialization || '',
          yearsOfExperience: data.qualifications?.yearsOfExperience || 0,
          netSetQualified: data.qualifications?.netSetQualified || false,
          researchPapers: data.qualifications?.researchPapers || 0
        });
      } catch (error) {
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth || null,
        ...(verified ? {} : { category: formData.category }),
        qualifications: {
          highestDegree: formData.highestDegree,
          specialization: formData.specialization,
          yearsOfExperience: Number(formData.yearsOfExperience),
          netSetQualified: formData.netSetQualified,
          researchPapers: Number(formData.researchPapers)
        }
      };
      await api.put('/faculty/profile', payload);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Layout><LoadingSpinner /></Layout>;

  const registrationOpen = schedule?.registration?.isOpen !== false;
  const qualificationsLocked = verified || !registrationOpen;
  // Keep a specialization that is not (or no longer) a department name selectable.
  const departmentOptions = formData.specialization && !departments.includes(formData.specialization)
    ? [formData.specialization, ...departments]
    : departments;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-1 text-sm text-gray-500">Update your personal information and qualifications.</p>
      </div>

      <PhaseBanner phase={schedule?.registration} />
      {verified && (
        <div className="mb-4 p-3 rounded-md border border-green-200 bg-green-50 text-sm text-green-800 max-w-4xl">
          Your documents are verified, so your qualifications and date of birth are locked. You can still update your phone number.
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg max-w-4xl">
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 border-b pb-2 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label-text">Full Name</label>
                <input type="text" disabled value={user?.name || ''} className="input-field bg-gray-50 text-gray-500" />
              </div>
              <div>
                <label className="label-text">Email Address</label>
                <input type="email" disabled value={user?.email || ''} className="input-field bg-gray-50 text-gray-500" />
              </div>
              <div>
                <label className="label-text">Phone Number</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required disabled={!registrationOpen} className="input-field" />
              </div>
              <div>
                <label className="label-text">Date of Birth</label>
                <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} disabled={qualificationsLocked} className="input-field" />
                <p className="mt-1 text-xs text-gray-500">Used to break ties in the merit list.</p>
              </div>
              {categories.length > 1 && (
                <div>
                  <label className="label-text">Reservation Category</label>
                  <select name="category" value={formData.category} onChange={handleChange} disabled={qualificationsLocked} className="input-field">
                    {categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">You compete for General seats on merit first, then for seats reserved for your category. Upload proof if you choose a reserved category.</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 border-b pb-2 mb-4">Qualifications</h3>
            <fieldset disabled={qualificationsLocked} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label-text">Highest Degree</label>
                <select name="highestDegree" value={formData.highestDegree} onChange={handleChange} className="input-field">
                  <option value="B.Ed">B.Ed</option>
                  <option value="M.Ed">M.Ed</option>
                  <option value="B.Tech">B.Tech</option>
                  <option value="M.Tech">M.Tech</option>
                  <option value="PhD">PhD</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="label-text">Specialization / Department</label>
                {departmentOptions.length > 0 ? (
                  <select name="specialization" value={formData.specialization} onChange={handleChange} required className="input-field">
                    <option value="" disabled>Select a department</option>
                    {departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                ) : (
                  <input type="text" name="specialization" value={formData.specialization} onChange={handleChange} required className="input-field" placeholder="e.g. Computer Science" />
                )}
                <p className="mt-1 text-xs text-gray-500">You can only opt for seats in this department. Changing it removes options for other departments.</p>
              </div>
              <div>
                <label className="label-text">Years of Experience</label>
                <input type="number" min="0" name="yearsOfExperience" value={formData.yearsOfExperience} onChange={handleChange} required className="input-field" />
              </div>
              <div>
                <label className="label-text">Research Papers Published</label>
                <input type="number" min="0" name="researchPapers" value={formData.researchPapers} onChange={handleChange} required className="input-field" />
              </div>
              <div className="flex items-center mt-4">
                <input type="checkbox" id="netSetQualified" name="netSetQualified" checked={formData.netSetQualified} onChange={handleChange} className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded" />
                <label htmlFor="netSetQualified" className="ml-2 block text-sm text-gray-900">
                  NET / SET Qualified
                </label>
              </div>
            </fieldset>
          </div>

          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={saving || !registrationOpen} className="btn-primary">
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default Profile;
