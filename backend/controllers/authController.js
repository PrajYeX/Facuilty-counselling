import crypto from 'crypto';
import { Op } from 'sequelize';
import { User } from '../models/index.js';
import { PRIVATE_FIELDS } from '../models/User.js';
import { normalizeDocuments } from '../services/documents.js';
import { sendEmail, appUrl } from '../services/mailer.js';
import jwt from 'jsonwebtoken';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

// Tokens are emailed in the clear and stored only as a hash.
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const newToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: hashToken(token) };
};

const sendVerificationEmail = async (user) => {
  const { token, hash } = newToken();
  await user.update({ emailVerifyTokenHash: hash });
  await sendEmail({
    to: user.email,
    subject: 'Faculty Counselling: verify your email',
    text: `Dear ${user.name},\n\nPlease confirm your email address by opening this link:\n${appUrl(`/verify-email?token=${token}`)}\n\nIf you did not register, ignore this email.`
  });
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

export const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    const userExists = await User.findOne({ where: { email } });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // The public route only ever creates faculty accounts.
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: 'faculty',
      emailVerified: false
    });

    if (user) {
      await sendVerificationEmail(user);
      res.status(201).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        token: generateToken(user.id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        collegeId: user.collegeId,
        token: generateToken(user.id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: PRIVATE_FIELDS }
    });

    if (user) {
      // Map id to _id in response if needed for frontend exact match
      const userObj = user.toJSON();
      userObj._id = userObj.id;
      userObj.documents = normalizeDocuments(userObj.documents);
      res.json(userObj);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    const user = token && await User.findOne({ where: { emailVerifyTokenHash: hashToken(String(token)) } });
    if (!user) {
      return res.status(400).json({ message: 'This verification link is invalid or has already been used' });
    }
    await user.update({ emailVerified: true, emailVerifyTokenHash: null });
    res.json({ message: 'Email verified. You can continue with your application.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resendVerification = async (req, res) => {
  try {
    if (req.user.emailVerified) {
      return res.json({ message: 'Your email is already verified' });
    }
    await sendVerificationEmail(req.user);
    res.json({ message: `Verification email sent to ${req.user.email}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Always answers the same way so the endpoint cannot be used to discover
// which emails are registered.
export const forgotPassword = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim();
    const user = email && await User.findOne({ where: { email } });
    if (user) {
      const { token, hash } = newToken();
      await user.update({ passwordResetTokenHash: hash, passwordResetExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS) });
      await sendEmail({
        to: user.email,
        subject: 'Faculty Counselling: reset your password',
        text: `Dear ${user.name},\n\nOpen this link within one hour to choose a new password:\n${appUrl(`/reset-password?token=${token}`)}\n\nIf you did not ask for this, ignore this email; your password is unchanged.`
      });
    }
    res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!password || String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const user = token && await User.findOne({
      where: { passwordResetTokenHash: hashToken(String(token)), passwordResetExpires: { [Op.gt]: new Date() } }
    });
    if (!user) {
      return res.status(400).json({ message: 'This reset link is invalid or has expired' });
    }
    // Resetting via an emailed link also proves the address.
    await user.update({ password, passwordResetTokenHash: null, passwordResetExpires: null, emailVerified: true });
    res.json({ message: 'Password updated. You can now sign in.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
