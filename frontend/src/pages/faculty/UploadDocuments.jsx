import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import PhaseBanner from '../../components/PhaseBanner';
import useSchedule from '../../hooks/useSchedule';

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
};

const STATUS_LABELS = {
  pending: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected'
};

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx';

const UploadDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reuploading, setReuploading] = useState(null);
  const schedule = useSchedule();

  const [docName, setDocName] = useState('');
  const [file, setFile] = useState(null);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      setDocuments(res.data.documents || []);
    } catch (error) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !docName) {
      toast.error('Please provide a name and select a file');
      return;
    }

    const formData = new FormData();
    formData.append('documentName', docName);
    formData.append('file', file);

    setUploading(true);
    try {
      await api.post('/faculty/upload-documents', formData);
      toast.success('Document uploaded successfully');
      setDocName('');
      setFile(null);
      e.target.reset();
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleReupload = async (docId, selected) => {
    if (!selected) return;
    const formData = new FormData();
    formData.append('file', selected);

    setReuploading(docId);
    try {
      await api.put(`/faculty/documents/${docId}`, formData);
      toast.success('Document re-uploaded and sent for review');
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Re-upload failed');
    } finally {
      setReuploading(null);
    }
  };

  const uploadOpen = schedule?.registration?.isOpen !== false;
  const reuploadOpen = uploadOpen || schedule?.verification?.isOpen !== false;
  const rejectedCount = documents.filter(d => d.status === 'rejected').length;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Upload Documents</h1>
        <p className="mt-1 text-sm text-gray-500">Provide proofs for your qualifications (Degree, Experience Letter, etc.)</p>
      </div>

      <PhaseBanner phase={uploadOpen ? schedule?.registration : schedule?.verification} />

      {rejectedCount > 0 && (
        <div className="mb-4 p-3 rounded-md border border-red-200 bg-red-50 text-sm text-red-800">
          {rejectedCount} document{rejectedCount > 1 ? 's were' : ' was'} rejected. See the reason below and upload a corrected file.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white shadow sm:rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">New Upload</h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <fieldset disabled={!uploadOpen} className="space-y-4">
                <div>
                  <label className="label-text">Document Name</label>
                  <input type="text" required value={docName} onChange={(e) => setDocName(e.target.value)} className="input-field" placeholder="e.g. PhD Certificate" />
                </div>
                <div>
                  <label className="label-text">File (PDF, JPG, PNG)</label>
                  <input type="file" required onChange={(e) => setFile(e.target.files[0] || null)} accept={ACCEPT} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
                </div>
                <button type="submit" disabled={uploading || !uploadOpen} className="w-full btn-primary mt-4">
                  {uploading ? 'Uploading...' : 'Upload File'}
                </button>
              </fieldset>
            </form>
            <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-sm rounded border border-blue-100">
              Each document is reviewed separately. You are verified once every document is approved.
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white shadow sm:rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Uploaded Documents</h3>
            </div>

            {loading ? (
              <div className="p-6"><LoadingSpinner /></div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {documents.length > 0 ? (
                  documents.map((doc) => (
                    <li key={doc.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Uploaded {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : '-'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_STYLES[doc.status]}`}>
                            {STATUS_LABELS[doc.status]}
                          </span>
                          <a href={`/${doc.filePath}`} target="_blank" rel="noreferrer" className="text-brand-600 hover:text-brand-900 text-sm font-medium">
                            View
                          </a>
                        </div>
                      </div>
                      {doc.status === 'rejected' && (
                        <div className="mt-3 p-3 rounded bg-red-50 border border-red-100">
                          <p className="text-sm text-red-800"><strong>Reason:</strong> {doc.reason}</p>
                          <label className={`mt-2 inline-block text-sm font-medium ${reuploadOpen ? 'text-brand-600 hover:text-brand-800 cursor-pointer' : 'text-gray-400'}`}>
                            {reuploading === doc.id ? 'Uploading...' : 'Re-upload corrected file'}
                            <input
                              type="file"
                              accept={ACCEPT}
                              className="hidden"
                              disabled={!reuploadOpen || reuploading === doc.id}
                              onChange={(e) => handleReupload(doc.id, e.target.files[0])}
                            />
                          </label>
                        </div>
                      )}
                    </li>
                  ))
                ) : (
                  <li className="px-6 py-8 text-center text-gray-500 text-sm">
                    No documents uploaded yet.
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default UploadDocuments;
