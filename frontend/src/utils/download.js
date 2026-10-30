import api from '../api/axios';

// Downloads an authenticated file (PDF, CSV) through the API client.
export const downloadFile = async (path, filename) => {
  const res = await api.get(path, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
