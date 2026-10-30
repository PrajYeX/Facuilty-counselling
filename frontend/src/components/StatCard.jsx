const StatCard = ({ title, value, icon: Icon, colorClass = "text-brand-600", bgClass = "bg-brand-50" }) => {
  return (
    <div className="bg-white rounded-lg shadow px-5 py-6 sm:px-6 flex items-center">
      <div className={`p-3 rounded-full ${bgClass}`}>
        <Icon className={`w-8 h-8 ${colorClass}`} />
      </div>
      <div className="ml-5">
        <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
};

export default StatCard;
