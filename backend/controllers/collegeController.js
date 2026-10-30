import { User, College, Allotment, DepartmentSeat, CounsellingRound } from '../models/index.js';
import { HELD_STATUSES } from '../models/Allotment.js';
import { PRIVATE_FIELDS } from '../models/User.js';
import { ROUND_LABELS } from '../services/allotment.js';
import { withSeatCounts } from '../services/colleges.js';
import { audit } from '../services/audit.js';
import { notify } from '../services/notify.js';

// ---- Admin: manage college logins ----

export const listCollegeAccounts = async (req, res) => {
  try {
    const accounts = await User.findAll({
      where: { role: 'college' },
      attributes: ['id', 'name', 'email', 'collegeId', 'createdAt'],
      include: [{ model: College, as: 'college', attributes: ['id', 'name', 'code'] }],
      order: [['collegeId', 'ASC']]
    });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createCollegeAccount = async (req, res) => {
  try {
    const college = await College.findByPk(req.params.id);
    if (!college) return res.status(404).json({ message: 'College not found' });
    const { name, email, password } = req.body;
    if (!email || !password || String(password).length < 6) {
      return res.status(400).json({ message: 'Email and a password of at least 6 characters are required' });
    }
    if (await User.findOne({ where: { email } })) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }
    const user = await User.create({
      name: name?.trim() || `${college.name} (${college.code})`,
      email,
      password,
      role: 'college',
      collegeId: college.id,
      emailVerified: true,
      verificationStatus: 'verified'
    });
    await audit(req, 'college_account.create', { targetType: 'college', targetId: college.id, summary: `Created college login ${email} for ${college.code}` });
    res.status(201).json({ id: user.id, name: user.name, email: user.email, collegeId: user.collegeId });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteCollegeAccount = async (req, res) => {
  try {
    const user = await User.findOne({ where: { id: req.params.userId, role: 'college' } });
    if (!user) return res.status(404).json({ message: 'College account not found' });
    await user.destroy();
    await audit(req, 'college_account.delete', { targetType: 'college', targetId: user.collegeId, summary: `Removed college login ${user.email}` });
    res.json({ message: 'College account removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---- College portal ----

export const getCollegeOverview = async (req, res) => {
  try {
    const college = await College.findByPk(req.user.collegeId, { include: [{ model: DepartmentSeat, as: 'seats' }] });
    if (!college) return res.status(404).json({ message: 'College not found' });
    const [withCounts] = await withSeatCounts([college]);

    const allotments = await Allotment.findAll({
      where: { collegeId: college.id, status: HELD_STATUSES },
      include: [
        { model: User, as: 'faculty', attributes: ['id', 'name', 'email', 'phone', 'rank', 'category'] },
        { model: CounsellingRound, as: 'counsellingRound', attributes: ['id', 'type', 'reportingDeadline'] }
      ],
      order: [['department', 'ASC']]
    });

    res.json({
      college: withCounts,
      allotments: allotments.map(a => ({
        ...a.toJSON(),
        roundLabel: ROUND_LABELS[a.counsellingRound?.type]
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markReporting = async (req, res) => {
  try {
    const { status, note } = req.body;
    if (!['reported', 'not_reported', null].includes(status ?? null)) {
      return res.status(400).json({ message: 'Status must be reported, not_reported or empty' });
    }
    const allotment = await Allotment.findOne({
      where: { id: req.params.id, collegeId: req.user.collegeId, status: HELD_STATUSES },
      include: [{ model: User, as: 'faculty', attributes: { exclude: PRIVATE_FIELDS } }]
    });
    if (!allotment) return res.status(404).json({ message: 'Allotment not found for your college' });

    await allotment.update({
      reportingStatus: status ?? null,
      reportedAt: status === 'reported' ? new Date() : null,
      reportingNote: note?.trim() || null
    });
    await audit(req, 'reporting.mark', {
      targetType: 'allotment', targetId: allotment.id,
      summary: `Marked ${allotment.faculty?.name} as ${status ? status.replace('_', ' ') : 'pending'} (${allotment.department})`,
      details: { note: allotment.reportingNote }
    });
    if (status && allotment.faculty) {
      await notify(allotment.faculty, {
        type: 'reporting',
        title: status === 'reported' ? 'Joining confirmed by college' : 'College marked you as not reported',
        message: status === 'reported'
          ? `Your reporting for duty in ${allotment.department} has been confirmed by the college.`
          : `The college has recorded that you did not report for duty in ${allotment.department}.${allotment.reportingNote ? ` Note: ${allotment.reportingNote}` : ''} Contact the college if this is wrong.`,
        link: '/faculty/allotment-status'
      });
    }
    res.json(allotment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
