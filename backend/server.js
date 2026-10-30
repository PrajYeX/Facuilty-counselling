import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
dotenv.config();

// Imports
import { connectDB, default as sequelize } from './config/db.js';
import './models/index.js'; // Initialize models and associations

import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import facultyRoutes from './routes/faculty.js';
import collegeRoutes from './routes/college.js';
import publicRoutes from './routes/public.js';
import accountRoutes from './routes/account.js';
import { startReminderScheduler } from './services/reminders.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/college', collegeRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/account', accountRoutes);

// Make uploads folder static
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Error Handler Middleware
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;

// On SQLite, `alter` rebuilds tables with DROP TABLE, which with foreign keys
// enforced cascades into child tables and silently deletes their rows.
const syncDatabase = async () => {
  const isSqlite = sequelize.getDialect() === 'sqlite';
  if (isSqlite) await sequelize.query('PRAGMA foreign_keys = OFF');
  try {
    await sequelize.sync({ alter: true });
  } finally {
    if (isSqlite) await sequelize.query('PRAGMA foreign_keys = ON');
  }
};

// Connect, sync models and start server. Connecting first matters on SQLite:
// a concurrent first query would open a second connection with foreign keys on.
connectDB().then(syncDatabase).then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  startReminderScheduler();
}).catch(err => {
  console.error('Failed to sync database models', err);
});
