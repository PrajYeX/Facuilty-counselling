const formatDate = (d) => new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

// Shows whether a counselling phase is open, and when it opens or closes.
const PhaseBanner = ({ phase }) => {
  if (!phase) return null;
  const { label, isOpen, startAt, endAt } = phase;

  if (isOpen) {
    if (!endAt) return null;
    return (
      <div className="mb-4 p-3 rounded-md border border-blue-200 bg-blue-50 text-sm text-blue-800">
        {label} is open until <strong>{formatDate(endAt)}</strong>.
      </div>
    );
  }

  const notYet = startAt && new Date() < new Date(startAt);
  return (
    <div className="mb-4 p-3 rounded-md border border-yellow-200 bg-yellow-50 text-sm text-yellow-800">
      {notYet
        ? <>{label} opens on <strong>{formatDate(startAt)}</strong>. You can view this page but not make changes yet.</>
        : <>{label} closed on <strong>{formatDate(endAt)}</strong>. Changes are no longer accepted.</>}
    </div>
  );
};

export default PhaseBanner;
