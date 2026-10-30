import { Op, fn, col } from 'sequelize';
import PDFDocument from 'pdfkit';
import { User, College, Allotment, DepartmentSeat, OptionEntry, AuditLog } from '../models/index.js';
import { HELD_STATUSES } from '../models/Allotment.js';
import { ROUND_LABELS, getActiveRounds, getCategoryOccupancy } from '../services/allotment.js';
import { getCategories, seatsByCategory } from '../services/categories.js';
import { audit } from '../services/audit.js';

const csvCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  // Leading =, +, - or @ would run as a formula when opened in Excel.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

const meritRows = async () => {
  const faculty = await User.findAll({
    where: { role: 'faculty', verificationStatus: 'verified', rank: { [Op.ne]: null } },
    order: [['rank', 'ASC']]
  });
  const categories = await getCategories();
  const label = (key) => categories.find(c => c.key === key)?.label || key;
  return faculty.map(f => ({
    rank: f.rank,
    name: f.name,
    email: f.email,
    category: label(f.category),
    degree: f.qualifications?.highestDegree || '',
    specialization: f.qualifications?.specialization || '',
    experience: f.qualifications?.yearsOfExperience ?? '',
    papers: f.qualifications?.researchPapers ?? '',
    dateOfBirth: f.dateOfBirth || '',
    score: f.totalScore
  }));
};

export const exportMeritList = async (req, res) => {
  try {
    const rows = await meritRows();
    const format = req.query.format === 'pdf' ? 'pdf' : 'csv';
    await audit(req, 'merit.export', { summary: `Exported merit list as ${format.toUpperCase()} (${rows.length} rows)` });

    if (format === 'csv') {
      const header = ['Rank', 'Name', 'Email', 'Category', 'Highest Degree', 'Specialization', 'Experience (years)', 'Research Papers', 'Date of Birth', 'Score'];
      const lines = [header, ...rows.map(r => [r.rank, r.name, r.email, r.category, r.degree, r.specialization, r.experience, r.papers, r.dateOfBirth, r.score])]
        .map(line => line.map(csvCell).join(','));
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="merit-list.csv"');
      return res.send('﻿' + lines.join('\r\n'));
    }

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="merit-list.pdf"');
    doc.pipe(res);
    doc.font('Helvetica-Bold').fontSize(14).text('Faculty Counselling - Merit List', { align: 'center' });
    doc.font('Helvetica').fontSize(9).text(`Generated ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
    doc.moveDown();

    const columns = [
      ['Rank', 'rank', 40], ['Name', 'name', 140], ['Category', 'category', 80], ['Degree', 'degree', 60],
      ['Specialization', 'specialization', 120], ['Exp', 'experience', 40], ['Papers', 'papers', 45],
      ['Date of Birth', 'dateOfBirth', 75], ['Score', 'score', 45]
    ];
    const drawRow = (values, bold) => {
      if (doc.y > doc.page.height - 60) doc.addPage();
      const y = doc.y;
      let x = doc.page.margins.left;
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
      columns.forEach(([, , width], i) => {
        doc.text(String(values[i] ?? ''), x, y, { width: width - 4, lineBreak: false, ellipsis: true });
        x += width;
      });
      doc.moveDown(0.6);
    };
    drawRow(columns.map(c => c[0]), true);
    rows.forEach(r => drawRow(columns.map(c => r[c[1]]), false));
    doc.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addTo = (map, key, total, filled) => {
  const entry = map.get(key) || { key, total: 0, filled: 0 };
  entry.total += total;
  entry.filled += filled;
  map.set(key, entry);
};

export const getAnalytics = async (req, res) => {
  try {
    const seats = await DepartmentSeat.findAll({ include: [{ model: College, as: 'college', attributes: ['tier', 'isActive'] }] });
    const categoryOccupancy = await getCategoryOccupancy();
    const categories = await getCategories();

    const byTier = new Map();
    const byDepartment = new Map();
    const byCategory = new Map();
    for (const seat of seats) {
      if (seat.college?.isActive === false) continue;
      const filledByCat = categoryOccupancy[seat.id] || {};
      const filled = Object.values(filledByCat).reduce((sum, n) => sum + n, 0);
      addTo(byTier, seat.college.tier, seat.totalSeats, filled);
      addTo(byDepartment, seat.department, seat.totalSeats, filled);
      const quotas = seatsByCategory(seat);
      for (const c of new Set([...Object.keys(quotas), ...Object.keys(filledByCat)])) {
        addTo(byCategory, c, quotas[c] || 0, filledByCat[c] || 0);
      }
    }
    const label = (key) => categories.find(c => c.key === key)?.label || key;

    // Round-over-round movement from each round's own allotments.
    const rounds = (await getActiveRounds()).filter(r => r.type !== 'mock');
    const statusCounts = await Allotment.findAll({
      attributes: ['roundId', 'status', [fn('COUNT', col('id')), 'count']],
      where: { roundId: rounds.map(r => r.id) },
      group: ['roundId', 'status'],
      raw: true
    });
    const roundStats = rounds.map(r => {
      const counts = Object.fromEntries(statusCounts.filter(s => s.roundId === r.id).map(s => [s.status, Number(s.count)]));
      return { id: r.id, type: r.type, label: ROUND_LABELS[r.type], summary: r.summary, outcomes: counts };
    });

    const [registered, emailVerified, verified, ranked, withOptions, holding, accepted, reported] = await Promise.all([
      User.count({ where: { role: 'faculty' } }),
      User.count({ where: { role: 'faculty', emailVerified: true } }),
      User.count({ where: { role: 'faculty', verificationStatus: 'verified' } }),
      User.count({ where: { role: 'faculty', rank: { [Op.ne]: null } } }),
      OptionEntry.count({ distinct: true, col: 'facultyId' }),
      Allotment.count({ where: { status: HELD_STATUSES } }),
      Allotment.count({ where: { status: 'accepted' } }),
      Allotment.count({ where: { status: HELD_STATUSES, reportingStatus: 'reported' } })
    ]);

    res.json({
      byTier: [...byTier.values()].sort((a, b) => a.key.localeCompare(b.key)),
      byDepartment: [...byDepartment.values()].sort((a, b) => b.total - a.total),
      byCategory: [...byCategory.values()].map(c => ({ ...c, label: label(c.key) })),
      rounds: roundStats,
      funnel: [
        { key: 'registered', label: 'Registered', value: registered },
        { key: 'emailVerified', label: 'Email verified', value: emailVerified },
        { key: 'verified', label: 'Documents verified', value: verified },
        { key: 'ranked', label: 'Ranked', value: ranked },
        { key: 'withOptions', label: 'Entered options', value: withOptions },
        { key: 'holding', label: 'Holding a seat', value: holding },
        { key: 'accepted', label: 'Accepted (Choice 1)', value: accepted },
        { key: 'reported', label: 'Reported to college', value: reported }
      ]
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAuditLog = async (req, res) => {
  try {
    const where = {};
    if (req.query.action) where.action = { [Op.like]: `${req.query.action}%` };
    if (req.query.actor) where.actorName = { [Op.like]: `%${req.query.actor}%` };
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const { rows, count } = await AuditLog.findAndCountAll({ where, order: [['id', 'DESC']], limit, offset });
    const actions = await AuditLog.findAll({ attributes: [[fn('DISTINCT', col('action')), 'action']], raw: true });
    res.json({ entries: rows, total: count, actions: actions.map(a => a.action).sort() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
