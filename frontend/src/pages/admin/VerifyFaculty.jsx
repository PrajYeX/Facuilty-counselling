import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Modal from '../../components/Modal';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const VerifyFaculty = () => {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reasons, setReasons] = useState({});
  const [bulkReason, setBulkReason] = useState('');

  const fetchFaculty = async () => {
    setLoading(true);
    try {
      // "Pending" means the admin has something to review, which includes rejected
      // faculty who still have unreviewed documents.
      const query = filter !== 'all' && filter !== 'pending' ? `?verificationStatus=${filter}` : '';
      const res = await api.get(`/admin/faculty-list${query}`);
      setFaculty(filter === 'pending'
        ? res.data.filter(f => f.verificationStatus === 'pending' || f.documents.some(d => d.status === 'pending'))
        : res.data);
    } catch (error) {
      toast.error('Failed to load faculty list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculty();
  }, [filter]);

  const openReview = (f) => {
    setSelectedFaculty(f);
    setReasons({});
    setBulkReason('');
    setIsModalOpen(true);
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.put(`/admin/verify-faculty/${id}`, { status, reason: bulkReason });
      toast.success(status === 'verified' ? 'All documents approved' : 'Documents rejected');
      setIsModalOpen(false);
      fetchFaculty();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleReviewDocument = async (docId, status) => {
    try {
      const res = await api.put(`/admin/faculty/${selectedFaculty._id}/documents/${docId}`, {
        status,
        reason: reasons[docId]
      });
      setSelectedFaculty(res.data);
      toast.success(status === 'approved' ? 'Document approved' : 'Document rejected');
      fetchFaculty();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to review document');
    }
  };

  const docBadge = (status) => {
    const classes = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${classes[status]}`}>{status}</span>;
  };

  const getStatusBadge = (status) => {
    const classes = {
      pending: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${classes[status]}`}>{status}</span>;
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Verify Faculty</h1>
        <p className="mt-1 text-sm text-gray-500">Review profiles and documents to verify faculty members.</p>
      </div>

      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['all', 'pending', 'verified', 'rejected'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`${filter === tab ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name & Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Highest Degree</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Experience</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documents</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {faculty.map((f) => (
                <tr key={f._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{f.name}</div>
                    <div className="text-sm text-gray-500">{f.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{f.qualifications?.highestDegree || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{f.qualifications?.yearsOfExperience || 0} years</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {f.documents.filter(d => d.status === 'approved').length}/{f.documents.length} approved
                    {f.documents.some(d => d.status === 'pending') && <span className="ml-1 text-yellow-700">· needs review</span>}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(f.verificationStatus)}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <button 
                      onClick={() => openReview(f)}
                      className="text-brand-600 hover:text-brand-900"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
              {faculty.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                    No faculty found matching the filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedFaculty && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Review: ${selectedFaculty.name}`}>
          <div className="mt-4 space-y-6">
            <div>
              <h4 className="text-sm font-medium text-gray-900 border-b pb-2">Qualifications</h4>
              <dl className="mt-2 grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs text-gray-500">Highest Degree</dt>
                  <dd className="text-sm text-gray-900">{selectedFaculty.qualifications?.highestDegree || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Experience</dt>
                  <dd className="text-sm text-gray-900">{selectedFaculty.qualifications?.yearsOfExperience || 0} years</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">NET/SET</dt>
                  <dd className="text-sm text-gray-900">{selectedFaculty.qualifications?.netSetQualified ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Research Papers</dt>
                  <dd className="text-sm text-gray-900">{selectedFaculty.qualifications?.researchPapers || 0}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 border-b pb-2">Uploaded Documents</h4>
              {selectedFaculty.documents?.length > 0 ? (
                <ul className="mt-2 divide-y divide-gray-200 border border-gray-200 rounded-md">
                  {selectedFaculty.documents.map((doc) => (
                    <li key={doc.id} className="p-3 text-sm space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex-1 truncate font-medium">{doc.name}</span>
                        {docBadge(doc.status)}
                        <a href={`/${doc.filePath}`} target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:text-brand-500">
                          View
                        </a>
                      </div>
                      {doc.status === 'rejected' && doc.reason && (
                        <p className="text-xs text-red-700">Reason: {doc.reason}</p>
                      )}
                      {doc.status === 'pending' && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={reasons[doc.id] || ''}
                            onChange={(e) => setReasons(prev => ({ ...prev, [doc.id]: e.target.value }))}
                            className="input-field mt-0 flex-1 text-xs"
                            placeholder="Reason, if rejecting"
                          />
                          <button onClick={() => handleReviewDocument(doc.id, 'approved')} className="btn-success px-3 py-1 text-xs">Approve</button>
                          <button
                            onClick={() => handleReviewDocument(doc.id, 'rejected')}
                            disabled={!reasons[doc.id]?.trim()}
                            className="btn-danger px-3 py-1 text-xs"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {doc.status === 'rejected' && (
                        <p className="text-xs text-gray-500">
                          Waiting for the faculty member to re-upload.{' '}
                          <button onClick={() => handleReviewDocument(doc.id, 'approved')} className="text-brand-600 hover:text-brand-800 font-medium">Approve anyway</button>
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-gray-500">No documents uploaded.</p>
              )}
            </div>

            {selectedFaculty.verificationStatus !== 'verified' && (
              <div className="border-t pt-4 space-y-3">
                <h4 className="text-sm font-medium text-gray-900">Review all at once</h4>
                <input
                  type="text"
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  className="input-field"
                  placeholder="Reason for rejecting all unapproved documents"
                />
                <div className="flex space-x-3">
                  <button onClick={() => handleUpdateStatus(selectedFaculty._id, 'verified')} className="btn-success flex-1">
                    Approve All
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedFaculty._id, 'rejected')}
                    disabled={!bulkReason.trim()}
                    className="btn-danger flex-1"
                  >
                    Reject Remaining
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </Layout>
  );
};

export default VerifyFaculty;
