import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findByPk(decoded.id);
      
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

export const isCollege = (req, res, next) => {
  if (req.user && req.user.role === 'college' && req.user.collegeId) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as a college' });
  }
};

// Faculty must confirm their email before submitting documents or options.
export const requireVerifiedEmail = (req, res, next) => {
  if (req.user?.emailVerified) return next();
  res.status(403).json({ message: 'Please verify your email address first. Check your inbox or resend the link from your dashboard.', emailUnverified: true });
};

export const isFaculty = (req, res, next) => {
  if (req.user && req.user.role === 'faculty') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as a faculty' });
  }
};
