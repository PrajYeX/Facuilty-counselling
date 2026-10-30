import { sequelize, User, College, DepartmentSeat, OptionEntry, ScoringCriteria } from '../models/index.js';
import { normalizeDocuments, newDocument, deriveVerificationStatus } from '../services/documents.js';
import {
  CounsellingError,
  CHOICES,
  isSeatEligible,
  getFacultyAllotmentView,
  exerciseChoice,
  getSeatOccupancy
} from '../services/allotment.js';
import { getPhase } from '../services/schedule.js';
import { writeAllotmentOrder } from '../services/allotmentPdf.js';
import { getCategories, seatsByCategory } from '../services/categories.js';
import { notify } from '../services/notify.js';
import { PRIVATE_FIELDS } from '../models/User.js';

const sendError = (res, error) => {
  res.status(error instanceof CounsellingError ? error.status : 500).json({ message: error.message });
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: PRIVATE_FIELDS }
    });

    if (user) {
      const json = user.toJSON();
      json.documents = normalizeDocuments(json.documents);
      res.json(json);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (user) {
      // Prevent updating restricted fields
      delete req.body.role;
      delete req.body.verificationStatus;
      delete req.body.totalScore;
      delete req.body.rank;
      delete req.body.documents;
      delete req.body.password;
      delete req.body.email; // Usually don't allow email change without verification
      delete req.body.collegeId;
      delete req.body.emailVerified;
      for (const field of PRIVATE_FIELDS) delete req.body[field];

      // Once verified, the details that feed the score are frozen.
      if (user.verificationStatus === 'verified') {
        delete req.body.qualifications;
        delete req.body.dateOfBirth;
        delete req.body.category;
      }
      if (req.body.category !== undefined) {
        const categories = await getCategories();
        if (!categories.some(c => c.key === req.body.category)) {
          return res.status(400).json({ message: 'Unknown category' });
        }
      }

      const oldSpecialization = user.qualifications?.specialization;
      await user.update(req.body);

      // Options for another department are no longer valid.
      if (user.qualifications?.specialization !== oldSpecialization) {
        const options = await OptionEntry.findAll({
          where: { facultyId: user.id },
          include: [{ model: DepartmentSeat, as: 'seat', include: [{ model: College, as: 'college' }] }]
        });
        const invalid = options.filter(o => !o.seat || !isSeatEligible(user, o.seat)).map(o => o.id);
        if (invalid.length) await OptionEntry.destroy({ where: { id: invalid } });
      }

      // Return updated profile without password
      const updatedUser = await User.findByPk(req.user.id, {
        attributes: { exclude: PRIVATE_FIELDS }
      });
      const json = updatedUser.toJSON();
      json.documents = normalizeDocuments(json.documents);
      res.json(json);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const uploadDocuments = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const name = String(req.body.documentName || '').trim() || req.file.originalname;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const documents = [...normalizeDocuments(user.documents), newDocument(name, req.file)];
    await user.update({ documents, verificationStatus: deriveVerificationStatus(documents) });

    res.json({ message: 'Document uploaded successfully', documents });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Replace the file behind a rejected document and send it back for review.
export const reuploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const user = await User.findByPk(req.user.id);
    const documents = normalizeDocuments(user.documents);
    const index = documents.findIndex(d => d.id === req.params.docId);
    if (index < 0) {
      return res.status(404).json({ message: 'Document not found' });
    }
    if (documents[index].status !== 'rejected') {
      return res.status(409).json({ message: 'Only rejected documents can be re-uploaded' });
    }
    documents[index] = { ...newDocument(documents[index].name, req.file), id: documents[index].id };
    await user.update({ documents, verificationStatus: deriveVerificationStatus(documents) });

    res.json({ message: 'Document re-uploaded and sent for review', documents });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFieldValue = (obj, path) => {
  return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined) ? acc[part] : null, obj);
};

const evaluateCondition = (fieldValue, operator, conditionValue) => {
  if (fieldValue === null || fieldValue === undefined) return false;
  
  switch (operator) {
    case 'eq': return fieldValue === conditionValue;
    case 'gte': return Number(fieldValue) >= Number(conditionValue);
    case 'lte': return Number(fieldValue) <= Number(conditionValue);
    case 'gt': return Number(fieldValue) > Number(conditionValue);
    case 'lt': return Number(fieldValue) < Number(conditionValue);
    case 'exists': return !!fieldValue === conditionValue;
    case 'in': return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
    default: return false;
  }
};

export const getMyScore = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const criteriaList = await ScoringCriteria.findAll({ where: { isActive: true } });
    
    const breakdown = [];
    let calculatedScore = 0;
    
    const userData = user.toJSON();

    for (let criteria of criteriaList) {
      const { name, field, condition, points } = criteria;
      const fieldValue = getFieldValue(userData, field);
      
      const op = (typeof condition === 'object' && condition !== null) ? condition.operator : condition;
      const val = (typeof condition === 'object' && condition !== null) ? condition.value : criteria.value;
      const earned = evaluateCondition(fieldValue, op, val);
      
      breakdown.push({
        criteria: name,
        pointsPossible: points,
        pointsEarned: earned ? points : 0,
        metCondition: earned
      });
      
      if (earned) {
        calculatedScore += points;
      }
    }

    res.json({
      totalScore: user.totalScore,
      calculatedScore,
      breakdown
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Seats in departments matching the faculty member's specialization.
export const getAvailableSeats = async (req, res) => {
  try {
    const seats = await DepartmentSeat.findAll({
      include: [{ model: College, as: 'college', where: { isActive: true } }]
    });
    const occupancy = await getSeatOccupancy();
    res.json({
      specialization: req.user.qualifications?.specialization || null,
      seats: seats
        .filter(seat => isSeatEligible(req.user, seat))
        .map(seat => ({ ...seat.toJSON(), categorySeats: seatsByCategory(seat), filledSeats: occupancy[seat.id] || 0 }))
        .sort((a, b) => a.college.tier.localeCompare(b.college.tier) || a.college.name.localeCompare(b.college.name))
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const getMyOptions = async (req, res) => {
  try {
    const options = await OptionEntry.findAll({
      where: { facultyId: req.user.id },
      include: [{ model: DepartmentSeat, as: 'seat', include: [{ model: College, as: 'college' }] }],
      order: [['priority', 'ASC']]
    });
    res.json(options);
  } catch (error) {
    sendError(res, error);
  }
};

// Replaces the whole option list with seatIds in preference order, which
// covers adding, removing and reordering in one save.
export const saveMyOptions = async (req, res) => {
  try {
    const { seatIds } = req.body;
    if (!Array.isArray(seatIds)) {
      return res.status(400).json({ message: 'seatIds must be an array' });
    }
    if (req.user.verificationStatus !== 'verified') {
      return res.status(403).json({ message: 'Only verified faculty can enter options' });
    }
    const ids = seatIds.map(Number);
    if (new Set(ids).size !== ids.length) {
      return res.status(400).json({ message: 'Each option can only be listed once' });
    }

    const seats = await DepartmentSeat.findAll({
      where: { id: ids },
      include: [{ model: College, as: 'college' }]
    });
    const seatById = new Map(seats.map(s => [s.id, s]));
    const invalid = ids.filter(id => !seatById.has(id) || !isSeatEligible(req.user, seatById.get(id)));
    if (invalid.length) {
      return res.status(400).json({ message: 'Some options are not open to your specialization or no longer exist' });
    }

    await sequelize.transaction(async (transaction) => {
      await OptionEntry.destroy({ where: { facultyId: req.user.id }, transaction });
      await OptionEntry.bulkCreate(
        ids.map((seatId, index) => ({ facultyId: req.user.id, seatId, priority: index + 1 })),
        { transaction }
      );
    });
    res.json({ message: `${ids.length} option(s) saved` });
  } catch (error) {
    sendError(res, error);
  }
};

export const getAllotmentStatus = async (req, res) => {
  try {
    const results = await getPhase('results');
    if (!results.hasStarted) {
      return res.json({ resultsPublished: false, resultsAt: results.startAt });
    }
    const view = await getFacultyAllotmentView(req.user.id);
    const choices = await getPhase('choices');
    res.json({
      resultsPublished: true,
      ...view,
      choicesOpen: choices.isOpen,
      choicesEndAt: choices.endAt,
      choiceLabels: Object.fromEntries(Object.entries(CHOICES).map(([key, c]) => [key, c.label]))
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const submitChoice = async (req, res) => {
  try {
    const allotment = await exerciseChoice(req.user.id, req.body.choice);
    await notify(req.user, {
      type: 'choice_recorded',
      title: 'Your choice has been recorded',
      message: `You chose "${CHOICES[req.body.choice].label}" for your allotment in ${allotment.department}. You can change it until the choices window closes.`,
      link: '/faculty/allotment-status'
    });
    res.json({ message: 'Your choice has been recorded', status: allotment.status });
  } catch (error) {
    sendError(res, error);
  }
};

export const downloadAllotmentOrder = async (req, res) => {
  try {
    const results = await getPhase('results');
    if (!results.hasStarted) {
      return res.status(403).json({ message: 'Results have not been published yet' });
    }
    const { current } = await getFacultyAllotmentView(req.user.id);
    if (!current || !['allotted', 'accepted', 'upgrade'].includes(current.status)) {
      return res.status(404).json({ message: 'You do not hold an allotted seat' });
    }
    writeAllotmentOrder(res, { allotment: current, faculty: req.user });
  } catch (error) {
    sendError(res, error);
  }
};

// Department names in use across colleges, for the specialization picker.
export const getDepartments = async (req, res) => {
  try {
    const rows = await DepartmentSeat.findAll({ attributes: ['department'], raw: true });
    const names = [...new Map(rows.map(r => [r.department.toLowerCase(), r.department])).values()];
    res.json(names.sort((a, b) => a.localeCompare(b)));
  } catch (error) {
    sendError(res, error);
  }
};
