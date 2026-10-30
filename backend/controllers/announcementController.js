import { Op } from 'sequelize';
import { Announcement, Notification } from '../models/index.js';
import { audit } from '../services/audit.js';

const AUDIENCES = ['all', 'faculty', 'college'];

const pickFields = ({ title, body, audience, pinned }) => {
  const fields = Object.fromEntries(Object.entries({ title, body, audience, pinned }).filter(([, v]) => v !== undefined));
  if (fields.audience && !AUDIENCES.includes(fields.audience)) throw new Error('Unknown audience');
  return fields;
};

// Admins see every announcement; others see those addressed to them.
export const listAnnouncements = async (req, res) => {
  try {
    const where = req.user.role === 'admin' ? {} : { audience: ['all', req.user.role] };
    const announcements = await Announcement.findAll({ where, order: [['pinned', 'DESC'], ['createdAt', 'DESC']] });
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.create({ ...pickFields(req.body), createdBy: req.user.id });
    await audit(req, 'announcement.create', { targetType: 'announcement', targetId: announcement.id, summary: `Posted "${announcement.title}"` });
    res.status(201).json(announcement);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findByPk(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
    await announcement.update(pickFields(req.body));
    await audit(req, 'announcement.update', { targetType: 'announcement', targetId: announcement.id, summary: `Edited "${announcement.title}"` });
    res.json(announcement);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findByPk(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
    await announcement.destroy();
    await audit(req, 'announcement.delete', { targetType: 'announcement', targetId: announcement.id, summary: `Deleted "${announcement.title}"` });
    res.json({ message: 'Announcement deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['id', 'DESC']],
      limit: 50
    });
    const unread = await Notification.count({ where: { userId: req.user.id, readAt: null } });
    res.json({ notifications, unread });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Marks the given ids read, or all of them when no ids are sent.
export const markNotificationsRead = async (req, res) => {
  try {
    const where = { userId: req.user.id, readAt: null };
    if (Array.isArray(req.body.ids) && req.body.ids.length) where.id = { [Op.in]: req.body.ids };
    await Notification.update({ readAt: new Date() }, { where });
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
