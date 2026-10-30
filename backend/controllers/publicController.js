import { User, College, Allotment, DepartmentSeat } from '../models/index.js';
import { ROUND_LABELS, getActiveRounds, getSeatOccupancy, getCategoryOccupancy } from '../services/allotment.js';
import { getCategories as loadCategories, seatsByCategory } from '../services/categories.js';
import { getPhase } from '../services/schedule.js';

// Rounds whose results are public: every completed real round, except the
// latest one while its results date has not arrived.
const publishedRounds = async () => {
  const real = (await getActiveRounds()).filter(r => r.type !== 'mock');
  const results = await getPhase('results');
  return results.hasStarted ? real : real.slice(0, -1);
};

export const getCategories = async (req, res) => {
  try {
    res.json(await loadCategories());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Seats per college, department and category, with current vacancies.
export const getSeatMatrix = async (req, res) => {
  try {
    const seats = await DepartmentSeat.findAll({
      include: [{ model: College, as: 'college', where: { isActive: true }, attributes: ['id', 'name', 'code', 'tier', 'location', 'district'] }]
    });
    const occupancy = await getSeatOccupancy();
    const categoryOccupancy = await getCategoryOccupancy();
    res.json({
      categories: await loadCategories(),
      seats: seats
        .map(s => ({
          id: s.id,
          department: s.department,
          college: s.college,
          totalSeats: s.totalSeats,
          categorySeats: seatsByCategory(s),
          filledSeats: occupancy[s.id] || 0,
          filledByCategory: categoryOccupancy[s.id] || {}
        }))
        .sort((a, b) => a.college.name.localeCompare(b.college.name) || a.department.localeCompare(b.department))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Opening and closing merit ranks per college, department, category and round,
// like KCET cutoff lists.
export const getCutoffs = async (req, res) => {
  try {
    const rounds = await publishedRounds();
    const allotments = await Allotment.findAll({
      where: { roundId: rounds.map(r => r.id) },
      include: [
        { model: User, as: 'faculty', attributes: ['rank'] },
        { model: College, as: 'college', attributes: ['id', 'name', 'code', 'tier'] }
      ]
    });

    const groups = new Map();
    for (const a of allotments) {
      const rank = a.faculty?.rank;
      if (!rank) continue;
      const key = `${a.roundId}|${a.seatId}|${a.category}`;
      const g = groups.get(key) || {
        roundId: a.roundId,
        seatId: a.seatId,
        college: a.college,
        department: a.department,
        category: a.category,
        openingRank: rank,
        closingRank: rank,
        allotted: 0
      };
      g.openingRank = Math.min(g.openingRank, rank);
      g.closingRank = Math.max(g.closingRank, rank);
      g.allotted++;
      groups.set(key, g);
    }

    res.json({
      categories: await loadCategories(),
      rounds: rounds.map(r => ({ id: r.id, type: r.type, label: ROUND_LABELS[r.type] })),
      cutoffs: [...groups.values()].sort((a, b) =>
        a.college.name.localeCompare(b.college.name) || a.department.localeCompare(b.department) || a.category.localeCompare(b.category))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Needs both email and date of birth so ranks cannot be browsed by guessing emails.
export const lookupRank = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim();
    const dateOfBirth = String(req.body.dateOfBirth || '').trim();
    if (!email || !dateOfBirth) {
      return res.status(400).json({ message: 'Enter your registered email and date of birth' });
    }
    const user = await User.findOne({ where: { email, role: 'faculty' } });
    if (!user || user.dateOfBirth !== dateOfBirth) {
      return res.status(404).json({ message: 'No applicant found with that email and date of birth' });
    }
    const categories = await loadCategories();
    res.json({
      name: user.name,
      rank: user.rank,
      totalScore: user.rank ? user.totalScore : null,
      category: categories.find(c => c.key === user.category)?.label || user.category,
      verificationStatus: user.verificationStatus
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
