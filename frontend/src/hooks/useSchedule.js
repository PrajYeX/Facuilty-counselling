import { useEffect, useState } from 'react';
import api from '../api/axios';

// Counselling phases keyed by name, e.g. schedule.option_entry.isOpen.
const useSchedule = (role = 'faculty') => {
  const [schedule, setSchedule] = useState(null);

  useEffect(() => {
    api.get(`/${role}/schedule`)
      .then(res => setSchedule(Object.fromEntries(res.data.map(p => [p.phase, p]))))
      .catch(() => setSchedule({}));
  }, [role]);

  return schedule;
};

export default useSchedule;
