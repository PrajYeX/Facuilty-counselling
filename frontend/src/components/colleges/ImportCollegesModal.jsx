import { useState } from 'react';
import Modal from '../Modal';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import { downloadFile } from '../../utils/download';

const ImportCollegesModal = ({ isOpen, onClose, onImported }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setErrors([]);
  };

  const send = async (dryRun) => {
    const form = new FormData();
    form.append('file', file);
    setBusy(true);
    setErrors([]);
    try {
      const res = await api.post(`/admin/colleges/import${dryRun ? '?dryRun=true' : ''}`, form);
      if (dryRun) {
        setPreview(res.data);
      } else {
        toast.success(`Imported: ${res.data.created.length} created, ${res.data.updated.length} updated`);
        reset();
        onImported();
        onClose();
      }
    } catch (error) {
      setPreview(null);
      setErrors(error.response?.data?.errors || [error.response?.data?.message || 'Import failed']);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }} title="Import colleges">
      <div className="space-y-4 text-sm">
        <p className="text-gray-600">
          Upload a CSV or Excel (.xlsx) file with one row per college department. Colleges are matched by code: new codes are created,
          existing ones are updated, and each listed department's seats are replaced. Departments not in the file are kept.
        </p>
        <button onClick={() => downloadFile('/admin/colleges/import-template', 'college-import-template.csv')} className="text-brand-600 hover:text-brand-800 font-medium">
          Download template
        </button>
        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={e => { setFile(e.target.files[0] || null); setPreview(null); setErrors([]); }}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
        />
        {errors.length > 0 && (
          <ul className="p-3 rounded border border-red-200 bg-red-50 text-red-800 list-disc list-inside space-y-1 max-h-48 overflow-y-auto">
            {errors.map(e => <li key={e}>{e}</li>)}
          </ul>
        )}
        {preview && (
          <div className="p-3 rounded border border-green-200 bg-green-50 text-green-900">
            File looks good: {preview.created.length} college(s) will be created{preview.created.length ? ` (${preview.created.join(', ')})` : ''} and {preview.updated.length} updated{preview.updated.length ? ` (${preview.updated.join(', ')})` : ''}.
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button onClick={() => send(true)} disabled={!file || busy} className="btn-secondary">Check file</button>
          <button onClick={() => send(false)} disabled={!preview || busy} className="btn-primary">{busy ? 'Working...' : 'Import'}</button>
        </div>
      </div>
    </Modal>
  );
};

export default ImportCollegesModal;
