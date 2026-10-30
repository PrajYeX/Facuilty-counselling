import crypto from 'crypto';

// Documents live in User.documents as a JSON array. Older rows used
// { name | documentName, filePath, uploadedAt | uploadDate, verified }.
// Normalize to one shape with a stable id and per-document review state.
export const normalizeDocuments = (docs) => (docs || []).map((doc, idx) => ({
  id: doc.id || `legacy-${idx}`,
  name: doc.name || doc.documentName || `Document ${idx + 1}`,
  filePath: doc.filePath,
  uploadedAt: doc.uploadedAt || doc.uploadDate || null,
  status: doc.status || (doc.verified ? 'approved' : 'pending'),
  reason: doc.reason || null,
  reviewedAt: doc.reviewedAt || null
}));

export const newDocument = (name, file) => ({
  id: crypto.randomUUID(),
  name,
  filePath: file.path.replace(/\\/g, '/'),
  uploadedAt: new Date(),
  status: 'pending',
  reason: null,
  reviewedAt: null
});

// Faculty is verified once every document is approved, rejected while any
// document is rejected, and pending otherwise.
export const deriveVerificationStatus = (docs) => {
  if (!docs.length) return 'pending';
  if (docs.some(d => d.status === 'rejected')) return 'rejected';
  if (docs.every(d => d.status === 'approved')) return 'verified';
  return 'pending';
};
