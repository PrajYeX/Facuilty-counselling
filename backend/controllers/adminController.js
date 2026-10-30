import { Op } from 'sequelize';
import { sequelize, User, College, Allotment, ScoringCriteria, DepartmentSeat } from '../models/index.js';
import { HELD_STATUSES } from '../models/Allotment.js';
import { PRIVATE_FIELDS } from '../models/User.js';
import { audit } from '../services/audit.js';
import { notify } from '../services/notify.js';
import { normalizeDocuments, deriveVerificationStatus } from '../services/documents.js';
import { TIE_BREAKERS, getTieBreakOrder, setTieBreakOrder, sortByMerit } from '../services/merit.js';
import { getActiveRounds } from '../services/allotment.js';
import { saveSeats, withSeatCounts, findCollegeWithSeats } from '../services/colleges.js';
import { getCategories as loadCategories, setCategories } from '../services/categories.js';

export const getDashboardStats = async (req, res) => {
  try {
    const totalFaculty = await User.count({ where: { role: 'faculty' } });
    const verifiedFaculty = await User.count({ where: { role: 'faculty', verificationStatus: 'verified' } });
    const pendingFaculty = await User.count({ where: { role: 'faculty', verificationStatus: 'pending' } });
    const rejectedFaculty = await User.count({ where: { role: 'faculty', verificationStatus: 'rejected' } });
    const totalColleges = await College.count();
    const totalAllotted = await Allotment.count({ where: { status: HELD_STATUSES } });

    res.json({
      totalFaculty,
      verifiedFaculty,
      pendingFaculty,
      rejectedFaculty,
      totalColleges,
      totalAllotted
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const pickCollegeFields = ({ name, code, location, district, tier, isActive }) =>
  Object.fromEntries(Object.entries({ name, code, location, district, tier, isActive }).filter(([, v]) => v !== undefined));

export const addCollege = async (req, res) => {
  try {
    const college = await sequelize.transaction(async (transaction) => {
      const created = await College.create(pickCollegeFields(req.body), { transaction });
      await saveSeats(created, req.body.seats, transaction);
      return created;
    });
    const json = await findCollegeWithSeats(college.id);
    await audit(req, 'college.create', { targetType: 'college', targetId: college.id, summary: `Added college ${json.name} (${json.code})`, details: { seats: json.seats.map(s => ({ department: s.department, categorySeats: s.categorySeats })) } });
    res.status(201).json(json);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getColleges = async (req, res) => {
  try {
    const filter = {};
    if (req.query.tier) filter.tier = req.query.tier;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const colleges = await College.findAll({
      where: filter,
      include: [{ model: DepartmentSeat, as: 'seats' }],
      order: [['name', 'ASC']]
    });
    res.json(await withSeatCounts(colleges));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCollege = async (req, res) => {
  try {
    const college = await College.findByPk(req.params.id);
    if (!college) {
      return res.status(404).json({ message: 'College not found' });
    }
    await sequelize.transaction(async (transaction) => {
      await college.update(pickCollegeFields(req.body), { transaction });
      if (req.body.seats) await saveSeats(college, req.body.seats, transaction);
    });
    const json = await findCollegeWithSeats(college.id);
    await audit(req, 'college.update', { targetType: 'college', targetId: college.id, summary: `Updated college ${json.name} (${json.code})`, details: { fields: pickCollegeFields(req.body), seats: req.body.seats ? json.seats.map(s => ({ department: s.department, categorySeats: s.categorySeats })) : undefined } });
    res.json(json);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteCollege = async (req, res) => {
  try {
    const college = await College.findByPk(req.params.id);
    if (!college) {
      return res.status(404).json({ message: 'College not found' });
    }
    const held = await Allotment.count({ where: { collegeId: college.id, status: HELD_STATUSES } });
    if (held) {
      return res.status(409).json({ message: `This college has ${held} allotted seat(s). Undo or reset the rounds first, or mark it inactive.` });
    }
    await sequelize.transaction(async (transaction) => {
      await DepartmentSeat.destroy({ where: { collegeId: college.id }, transaction });
      await college.destroy({ transaction });
    });
    await audit(req, 'college.delete', { targetType: 'college', targetId: college.id, summary: `Deleted college ${college.name} (${college.code})` });
    res.json({ message: 'College removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addScoringCriteria = async (req, res) => {
  try {
    let payload = { ...req.body };
    if (typeof payload.condition === 'string') {
      let val = payload.value;
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (!isNaN(val) && typeof val === 'string' && val.trim() !== '') val = Number(val);
      payload.condition = { operator: payload.condition, value: val };
    }
    const criteria = await ScoringCriteria.create(payload);
    await audit(req, 'criteria.create', { targetType: 'criteria', targetId: criteria.id, summary: `Added scoring rule "${criteria.name}" (+${criteria.points})`, details: payload });
    res.status(201).json(criteria);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getScoringCriteria = async (req, res) => {
  try {
    const criteria = await ScoringCriteria.findAll();
    res.json(criteria);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateScoringCriteria = async (req, res) => {
  try {
    const criteria = await ScoringCriteria.findByPk(req.params.id);
    if (!criteria) {
      return res.status(404).json({ message: 'Scoring criteria not found' });
    }
    let payload = { ...req.body };
    if (typeof payload.condition === 'string') {
      let val = payload.value;
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (!isNaN(val) && typeof val === 'string' && val.trim() !== '') val = Number(val);
      payload.condition = { operator: payload.condition, value: val };
    }
    await criteria.update(payload);
    await audit(req, 'criteria.update', { targetType: 'criteria', targetId: criteria.id, summary: `Updated scoring rule "${criteria.name}"`, details: payload });
    res.json(criteria);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteScoringCriteria = async (req, res) => {
  try {
    const criteria = await ScoringCriteria.findByPk(req.params.id);
    if (!criteria) {
      return res.status(404).json({ message: 'Scoring criteria not found' });
    }
    await criteria.destroy();
    await audit(req, 'criteria.delete', { targetType: 'criteria', targetId: criteria.id, summary: `Deleted scoring rule "${criteria.name}"` });
    res.json({ message: 'Scoring criteria removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toFacultyJSON = (user) => {
  const json = user.toJSON();
  json.documents = normalizeDocuments(json.documents);
  return json;
};

export const getFacultyList = async (req, res) => {
  try {
    const filter = { role: 'faculty' };
    if (req.query.verificationStatus) filter.verificationStatus = req.query.verificationStatus;
    
    const faculty = await User.findAll({ 
      where: filter,
      attributes: { exclude: PRIVATE_FIELDS } 
    });
    res.json(faculty.map(toFacultyJSON));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Tells the faculty member about rejected documents and about becoming verified.
const notifyReviewOutcome = async (faculty, previousStatus, rejectedDocs) => {
  if (rejectedDocs.length) {
    await notify(faculty, {
      type: 'document_rejected',
      title: rejectedDocs.length === 1 ? `Document rejected: ${rejectedDocs[0].name}` : `${rejectedDocs.length} documents rejected`,
      message: rejectedDocs.map(d => `${d.name}: ${d.reason}`).join('\n') + '\n\nPlease upload corrected copies on the portal.',
      link: '/faculty/upload-documents'
    });
  }
  if (faculty.verificationStatus === 'verified' && previousStatus !== 'verified') {
    await notify(faculty, {
      type: 'verified',
      title: 'Your documents are verified',
      message: 'All your documents have been approved. You can enter your college options once option entry opens.',
      link: '/faculty/options'
    });
  }
};

// Approve or reject every document at once. Rejection needs a reason, which
// is recorded against each document that was not already approved.
export const verifyFaculty = async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be verified or rejected' });
    }
    if (status === 'rejected' && !reason?.trim()) {
      return res.status(400).json({ message: 'A reason is required when rejecting' });
    }
    const faculty = await User.findByPk(req.params.id);
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }
    const previousStatus = faculty.verificationStatus;
    const reviewedAt = new Date();
    const documents = normalizeDocuments(faculty.documents).map(doc => {
      if (status === 'verified') return { ...doc, status: 'approved', reason: null, reviewedAt };
      return doc.status === 'approved' ? doc : { ...doc, status: 'rejected', reason: reason.trim(), reviewedAt };
    });
    await faculty.update({
      documents,
      // With no documents there is nothing to derive from, so take the admin's decision as-is.
      verificationStatus: documents.length ? deriveVerificationStatus(documents) : status
    });
    const newlyRejected = documents.filter(d => d.status === 'rejected' && d.reviewedAt === reviewedAt);
    await notifyReviewOutcome(faculty, previousStatus, newlyRejected);
    await audit(req, status === 'verified' ? 'faculty.approve_all' : 'faculty.reject_all', {
      targetType: 'faculty', targetId: faculty.id,
      summary: `${status === 'verified' ? 'Approved all documents of' : 'Rejected unapproved documents of'} ${faculty.name}`,
      details: status === 'rejected' ? { reason: reason.trim() } : undefined
    });
    res.json(toFacultyJSON(faculty));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const reviewDocument = async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }
    if (status === 'rejected' && !reason?.trim()) {
      return res.status(400).json({ message: 'A reason is required when rejecting a document' });
    }
    const faculty = await User.findByPk(req.params.id);
    if (!faculty || faculty.role !== 'faculty') {
      return res.status(404).json({ message: 'Faculty not found' });
    }
    const documents = normalizeDocuments(faculty.documents);
    const doc = documents.find(d => d.id === req.params.docId);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }
    Object.assign(doc, {
      status,
      reason: status === 'rejected' ? reason.trim() : null,
      reviewedAt: new Date()
    });
    const previousStatus = faculty.verificationStatus;
    await faculty.update({ documents, verificationStatus: deriveVerificationStatus(documents) });
    await notifyReviewOutcome(faculty, previousStatus, status === 'rejected' ? [doc] : []);
    await audit(req, status === 'approved' ? 'document.approve' : 'document.reject', {
      targetType: 'faculty', targetId: faculty.id,
      summary: `${status === 'approved' ? 'Approved' : 'Rejected'} "${doc.name}" of ${faculty.name}`,
      details: { documentId: doc.id, reason: doc.reason }
    });
    res.json(toFacultyJSON(faculty));
  } catch (error) {
    res.status(400).json({ message: error.message });
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

export const calculateScores = async (req, res) => {
  try {
    const facultyList = await User.findAll({ where: { role: 'faculty', verificationStatus: 'verified' } });
    const criteriaList = await ScoringCriteria.findAll({ where: { isActive: true } });

    for (let faculty of facultyList) {
      let totalScore = 0;
      // Sequelize JSON is already parsed as object
      const facultyData = faculty.toJSON();

      for (let criteria of criteriaList) {
        const { field, condition, points } = criteria;
        const fieldValue = getFieldValue(facultyData, field);
        const op = (typeof condition === 'object' && condition !== null) ? condition.operator : condition;
        const val = (typeof condition === 'object' && condition !== null) ? condition.value : criteria.value;
        if (evaluateCondition(fieldValue, op, val)) {
          totalScore += points;
        }
      }
      
      await faculty.update({ totalScore });
    }
    
    await audit(req, 'scores.calculate', { summary: `Calculated scores for ${facultyList.length} verified faculty` });
    res.json({ message: 'Scores calculated successfully for all verified faculty' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const generateMeritList = async (req, res) => {
  try {
    const realRounds = (await getActiveRounds()).filter(r => r.type !== 'mock');
    if (realRounds.length) {
      return res.status(409).json({ message: 'Ranks are locked once Round 1 has run. Reset counselling to regenerate the merit list.' });
    }

    const facultyList = await User.findAll({ 
      where: { role: 'faculty', verificationStatus: 'verified' }
    });
    const ordered = sortByMerit(facultyList, await getTieBreakOrder());

    await sequelize.transaction(async (transaction) => {
      await User.update(
        { rank: null },
        { where: { role: 'faculty', verificationStatus: { [Op.ne]: 'verified' } }, transaction }
      );
      for (const [index, faculty] of ordered.entries()) {
        await faculty.update({ rank: index + 1 }, { transaction });
      }
    });

    await audit(req, 'merit.generate', { summary: `Generated merit list with ${ordered.length} ranked faculty` });
    res.json({ message: 'Merit list generated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMeritList = async (req, res) => {
  try {
    const faculty = await User.findAll({
      where: { role: 'faculty', verificationStatus: 'verified' },
      attributes: { exclude: [...PRIVATE_FIELDS, 'documents'] }
    });
    // Ranked faculty first in rank order, then anyone verified since the last run.
    faculty.sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || (b.totalScore || 0) - (a.totalScore || 0));
    res.json(faculty);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTieBreakers = async (req, res) => {
  try {
    const order = await getTieBreakOrder();
    res.json({
      order,
      available: Object.entries(TIE_BREAKERS).map(([key, { label }]) => ({ key, label }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTieBreakers = async (req, res) => {
  try {
    if (!Array.isArray(req.body.order)) {
      return res.status(400).json({ message: 'order must be an array of tie-breaker keys' });
    }
    const order = await setTieBreakOrder(req.body.order);
    await audit(req, 'tiebreak.update', { summary: `Set tie-break order: ${order.join(' > ') || 'none'}`, details: { order } });
    res.json({ order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getCategories = async (req, res) => {
  try {
    res.json(await loadCategories());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCategories = async (req, res) => {
  try {
    const before = await loadCategories();
    const categories = await setCategories(req.body.categories);
    const removed = before.filter(c => !categories.some(n => n.key === c.key)).map(c => c.key);
    if (removed.length) {
      const inUse = await User.count({ where: { role: 'faculty', category: removed } });
      const seats = (await DepartmentSeat.findAll()).filter(s => removed.some(k => s.categorySeats?.[k] > 0));
      if (inUse || seats.length) {
        await setCategories(before.filter(c => c.key !== 'GEN'));
        return res.status(409).json({ message: `Cannot remove ${removed.join(', ')}: still used by ${inUse} faculty and ${seats.length} department(s)` });
      }
    }
    await audit(req, 'categories.update', { summary: `Categories: ${categories.map(c => c.key).join(', ')}`, details: { categories } });
    res.json(categories);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
