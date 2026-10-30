import { Setting } from '../models/index.js';

const DEGREE_LEVEL = { PhD: 4, 'M.Tech': 3, 'M.Ed': 3, 'B.Tech': 2, 'B.Ed': 2 };

// Each tie-breaker returns a negative number when a should rank above b.
export const TIE_BREAKERS = {
  degree: {
    label: 'Higher degree',
    compare: (a, b) => (DEGREE_LEVEL[b.qualifications?.highestDegree] || 1) - (DEGREE_LEVEL[a.qualifications?.highestDegree] || 1)
  },
  experience: {
    label: 'More years of experience',
    compare: (a, b) => Number(b.qualifications?.yearsOfExperience || 0) - Number(a.qualifications?.yearsOfExperience || 0)
  },
  papers: {
    label: 'More research papers',
    compare: (a, b) => Number(b.qualifications?.researchPapers || 0) - Number(a.qualifications?.researchPapers || 0)
  },
  dob: {
    label: 'Older date of birth',
    compare: (a, b) => {
      if (!a.dateOfBirth && !b.dateOfBirth) return 0;
      if (!a.dateOfBirth) return 1;
      if (!b.dateOfBirth) return -1;
      return String(a.dateOfBirth).localeCompare(String(b.dateOfBirth));
    }
  }
};

export const DEFAULT_TIE_BREAK_ORDER = ['degree', 'experience', 'papers', 'dob'];

export const getTieBreakOrder = async () => {
  const setting = await Setting.findByPk('tieBreakOrder');
  const order = setting?.value;
  return Array.isArray(order) && order.length ? order.filter(k => TIE_BREAKERS[k]) : DEFAULT_TIE_BREAK_ORDER;
};

export const setTieBreakOrder = async (order) => {
  const valid = [...new Set(order)].filter(k => TIE_BREAKERS[k]);
  await Setting.upsert({ key: 'tieBreakOrder', value: valid });
  return valid;
};

// Score first, then the configured tie-breakers, then registration order so
// the result is always deterministic.
export const sortByMerit = (faculty, order) => [...faculty].sort((a, b) => {
  const byScore = (b.totalScore || 0) - (a.totalScore || 0);
  if (byScore) return byScore;
  for (const key of order) {
    const diff = TIE_BREAKERS[key].compare(a, b);
    if (diff) return diff;
  }
  return a.id - b.id;
});
