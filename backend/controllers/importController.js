import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import { sequelize, College, DepartmentSeat } from '../models/index.js';
import { getCategories, seatsByCategory } from '../services/categories.js';
import { saveSeats } from '../services/colleges.js';
import { audit } from '../services/audit.js';

const TIERS = ['Tier 1', 'Tier 2', 'Tier 3'];
const BASE_COLUMNS = ['code', 'name', 'location', 'district', 'tier', 'department'];

const readRows = async (file) => {
  const name = file.originalname.toLowerCase();
  if (name.endsWith('.xlsx')) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return [];
    const headers = [];
    sheet.getRow(1).eachCell((cell, i) => { headers[i] = String(cell.text || '').trim(); });
    const rows = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const record = {};
      headers.forEach((h, i) => { if (h) record[h] = String(row.getCell(i).text || '').trim(); });
      if (Object.values(record).some(Boolean)) rows.push(record);
    });
    return rows;
  }
  if (name.endsWith('.csv')) {
    return parse(file.buffer.toString('utf8').replace(/^﻿/, ''), { columns: true, skip_empty_lines: true, trim: true });
  }
  throw new Error('Upload a .csv or .xlsx file');
};

// One row per college department. Category columns are named by category key
// (GEN, plus any custom ones); a plain "seats" column counts as GEN.
const toCollegePlans = (rows, categories) => {
  const errors = [];
  const plans = new Map();
  const keys = categories.map(c => c.key);

  rows.forEach((raw, index) => {
    const line = index + 2;
    const row = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.trim().toLowerCase(), String(v ?? '').trim()]));
    const code = row.code;
    if (!code) return errors.push(`Row ${line}: code is required`);

    const plan = plans.get(code) || { code, fields: {}, seats: [] };
    for (const field of ['name', 'location', 'district']) {
      if (row[field]) plan.fields[field] = row[field];
    }
    if (row.tier) {
      const tier = TIERS.find(t => t.toLowerCase() === row.tier.toLowerCase() || t.endsWith(` ${row.tier}`));
      if (!tier) errors.push(`Row ${line}: tier must be one of ${TIERS.join(', ')}`);
      else plan.fields.tier = tier;
    }

    if (row.department) {
      const categorySeats = {};
      if (row.seats) categorySeats.GEN = row.seats;
      for (const key of keys) {
        const value = row[key.toLowerCase()];
        if (value) categorySeats[key] = value;
      }
      const unknown = Object.keys(row).filter(k => !BASE_COLUMNS.includes(k) && k !== 'seats' && !keys.some(key => key.toLowerCase() === k) && row[k]);
      if (unknown.length) errors.push(`Row ${line}: unknown column(s) ${unknown.join(', ')}; add these categories first`);
      for (const [key, value] of Object.entries(categorySeats)) {
        if (!/^\d+$/.test(value)) errors.push(`Row ${line}: ${key} seats must be a whole number`);
      }
      if (plan.seats.some(s => s.department.toLowerCase() === row.department.toLowerCase())) {
        errors.push(`Row ${line}: ${row.department} is listed twice for ${code}`);
      }
      plan.seats.push({ department: row.department, categorySeats: Object.fromEntries(Object.entries(categorySeats).map(([k, v]) => [k, Number(v)])) });
    }
    plans.set(code, plan);
  });
  return { plans: [...plans.values()], errors };
};

// Creates new colleges and updates existing ones (matched by code). Departments
// in the file replace that department's quotas; other departments are kept.
export const importColleges = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const categories = await getCategories();
    const rows = await readRows(req.file);
    if (!rows.length) return res.status(400).json({ message: 'The file has no data rows' });

    const { plans, errors } = toCollegePlans(rows, categories);
    if (errors.length) return res.status(400).json({ message: 'Fix these problems and upload again', errors });

    const dryRun = req.query.dryRun === 'true';
    const result = { created: [], updated: [] };
    const transaction = await sequelize.transaction();
    try {
      for (const plan of plans) {
        let college = await College.findOne({ where: { code: plan.code }, transaction });
        const isNew = !college;
        if (isNew) {
          const missing = ['name', 'tier'].filter(f => !plan.fields[f]);
          if (missing.length) throw new Error(`${plan.code}: new colleges need ${missing.join(' and ')}`);
          college = await College.create({ code: plan.code, ...plan.fields }, { transaction });
        } else {
          await college.update(plan.fields, { transaction });
        }

        const existing = await DepartmentSeat.findAll({ where: { collegeId: college.id }, transaction });
        const merged = existing
          .filter(s => !plan.seats.some(p => p.department.toLowerCase() === s.department.toLowerCase()))
          .map(s => ({ department: s.department, categorySeats: seatsByCategory(s) }));
        await saveSeats(college, [...merged, ...plan.seats], transaction);
        (isNew ? result.created : result.updated).push(plan.code);
      }
      if (dryRun) await transaction.rollback(); else await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Import failed; nothing was changed', errors: [error.message] });
    }

    if (!dryRun) {
      await audit(req, 'college.import', {
        summary: `Imported colleges: ${result.created.length} created, ${result.updated.length} updated`,
        details: { file: req.file.originalname, ...result }
      });
    }
    res.json({ dryRun, ...result });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getImportTemplate = async (req, res) => {
  const categories = await getCategories();
  const keys = categories.map(c => c.key);
  const header = [...BASE_COLUMNS, ...keys];
  const example = (code, name, location, district, tier, department, gen) =>
    [code, name, location, district, tier, department, gen, ...keys.slice(1).map(() => '0')];
  const lines = [
    header,
    example('GEC01', 'Government Engineering College', 'Bengaluru', 'Bengaluru Urban', 'Tier 1', 'Computer Science', '3'),
    example('GEC01', '', '', '', '', 'Electronics', '2')
  ];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="college-import-template.csv"');
  res.send(lines.map(l => l.join(',')).join('\r\n'));
};
