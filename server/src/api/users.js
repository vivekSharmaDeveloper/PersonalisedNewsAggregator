const express = require('express');
const User = require('../models/User');
const Article = require('../models/Article');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const { requireAuth } = require('../middlewares');
const { validate, sanitize } = require('../middlewares/validation');
const {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  preferencesSchema,
  userProfileSchema,
  avatarUpdateSchema
} = require('../validators/schemas');
const {
  sendWelcomeEmail,
  sendForgotPasswordEmail,
  sendPasswordResetConfirmationEmail
} = require('../services/emailService');
const { ValidationError, ConflictError, NotFoundError, AuthenticationError } = require('../errors/AppError');
const jwt = require('jsonwebtoken');

const router = express.Router();

// GET /api/v1/users/check-username/:username
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const existingUser = await User.findOne({ username });
    
    if (existingUser) {
      return res.status(409).json({ 
        available: false, 
        message: 'Username is already taken' 
      });
    }
    
    res.json({ 
      available: true, 
      message: 'Username is available' 
    });
  } catch (err) {
    console.error('Username check error:', err);
    res.status(500).json({ error: 'Failed to check username availability' });
  }
});

// GET /api/v1/users/:username/preferences
router.get('/:username/preferences', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ interests: user.interests, sources: user.sources, onboarded: user.onboarded });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// PUT /api/v1/users/:username/preferences
router.put('/:username/preferences', async (req, res) => {
  try {
    const { interests, sources, onboarded } = req.body;
    const user = await User.findOneAndUpdate(
      { username: req.params.username },
      { interests, sources, onboarded },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ interests: user.interests, sources: user.sources, onboarded: user.onboarded });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// GET /api/v1/users/:username/personalized-articles
router.get('/:username/personalized-articles', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { page = 1, limit = 10 } = req.query;
    const filter = {};
    if (user.interests && user.interests.length > 0) {
      filter["description"] = { $regex: user.interests.join('|'), $options: 'i' };
    }
    if (user.subscribedSources && user.subscribedSources.length > 0) {
      filter["source"] = { $in: user.subscribedSources };
    }
    const articles = await Article.find(filter)
      .sort({ publishedAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));
    const total = await Article.countDocuments(filter);
    res.json({
      articles,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch personalized articles' });
  }
});

// POST /api/v1/users/signup
router.post('/signup', sanitize, validate(signupSchema), async (req, res, next) => {
  try {
    const { fullName, username, email, password } = req.body;
    
    // Check if username or email already exists
    const existingUser = await User.findOne({ $or: [ { username }, { email } ] });
    if (existingUser) {
      throw new ConflictError('Username or email already exists');
    }
    
    // Create new user (password will be hashed by pre-save hook)
    const user = new User({ fullName, username, email, password });
    await user.save();
    
    // Send welcome email
    sendWelcomeEmail(user);

    res.status(201).json({ 
      status: 'success',
      message: 'Account created successfully',
      data: {
        username: user.username,
        email: user.email,
        fullName: user.fullName
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/users/forgot-password
router.post('/forgot-password', sanitize, validate(forgotPasswordSchema), async (req, res, next) => {
  const { identifier } = req.body; // username or email
  if (!identifier) return res.status(400).json({ error: 'Username or email is required' });
  try {
    // Find user by username or email
    const user = await User.findOne({ $or: [ { username: identifier }, { email: identifier } ] });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Generate a reset token (simple random string for now)
    const token = Math.random().toString(36).substr(2) + Date.now().toString(36);
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 60; // 1 hour expiry
    await user.save();

    // Send email via SendGrid using the email service
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    sendForgotPasswordEmail(user, resetUrl);

    res.json({ message: 'Password reset email sent' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to send password reset email' });
  }
});

// POST /api/v1/users/login
router.post('/login', sanitize, validate(loginSchema), async (req, res, next) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Username/email and password are required.' });
  }
  try {
    // Find user by username or email
    const user = await User.findOne({ $or: [ { username: identifier }, { email: identifier } ] });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    // Save last login time and location
    user.lastLogin = new Date();
    // Try to get IP address from headers or req.ip
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip;
    user.lastLoginLocation = ip;
    await user.save();
    // Generate JWT
    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email },
      process.env.JWT_SECRET || 'default_jwt_secret',
      { expiresIn: '7d' }
    );
    // Return user info (omit password)
    const userInfo = {
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      avatar: user.avatar,
      interests: user.interests,
      sources: user.sources,
      onboarded: user.onboarded,
      lastLogin: user.lastLogin,
      lastLoginLocation: user.lastLoginLocation,
      _id: user._id
    };
    return res.json({ token, user: userInfo });
  } catch (err) {
    return res.status(500).json({ error: 'Login failed.' });
  }
});

// POST /api/v1/users/preferences
router.post('/preferences', requireAuth, sanitize, validate(preferencesSchema), async (req, res, next) => {
  try {
    const { interests, sources, onboarded } = req.body;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await User.findByIdAndUpdate(
      userId,
      { interests, sources, onboarded },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ interests: user.interests, sources: user.sources, onboarded: user.onboarded });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// PUT /api/v1/users/:username/avatar
router.put('/:username/avatar', async (req, res) => {
  const { avatar } = req.body;
  if (!avatar) {
    return res.status(400).json({ error: 'Avatar is required.' });
  }
  try {
    const user = await User.findOneAndUpdate(
      { username: req.params.username },
      { avatar },
      { new: true }
    );
    if (!user) {
      console.error(`User not found for avatar update: ${req.params.username}`);
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ avatar: user.avatar });
  } catch (err) {
    console.error('Failed to update avatar:', err, err?.message, err?.stack);
    res.status(500).json({ error: 'Failed to update avatar.' });
  }
});

// POST /api/v1/users/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  console.log('Reset password request:', { token, newPassword });
  if (!token || !newPassword) {
    console.log('Missing token or newPassword');
    return res.status(400).json({ error: 'Token and new password are required.' });
  }
  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) {
      console.log('Invalid or expired token:', token);
      return res.status(400).json({ error: 'Invalid or expired token.' });
    }
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    console.log('Password reset successful for user:', user.username);
    // Send password reset confirmation email
    sendPasswordResetConfirmationEmail(user);
    res.json({ message: 'Password reset successful.' });
  } catch (err) {
    console.error('Failed to reset password:', err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// POST /api/v1/users/:username/change-password
router.post('/:username/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findOne({ username: req.params.username });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) return res.status(401).json({ error: 'Incorrect password' });
  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password changed successfully' });
});

// POST /api/v1/users/:username/delete
router.post('/:username/delete', async (req, res) => {
  const { password } = req.body;
  const user = await User.findOne({ username: req.params.username });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const isMatch = await user.matchPassword(password);
  if (!isMatch) return res.status(401).json({ error: 'Incorrect password' });
  await user.deleteOne();
  res.json({ message: 'Account deleted successfully' });
});

// POST /api/v1/users/:username/bookmarks
router.post('/:username/bookmarks', requireAuth, async (req, res) => {
  try {
    const { articleId } = req.body;
    if (!articleId) {
      return res.status(400).json({ error: 'Article ID is required' });
    }
    
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if article is already bookmarked
    if (user.bookmarks.includes(articleId)) {
      return res.status(409).json({ error: 'Article already bookmarked' });
    }
    
    // Add bookmark
    user.bookmarks.push(articleId);
    await user.save();
    
    res.json({ message: 'Article bookmarked successfully', bookmarks: user.bookmarks });
  } catch (err) {
    console.error('Bookmark error:', err);
    res.status(500).json({ error: 'Failed to bookmark article' });
  }
});

// DELETE /api/v1/users/:username/bookmarks/:articleId
router.delete('/:username/bookmarks/:articleId', requireAuth, async (req, res) => {
  try {
    const { articleId } = req.params;
    
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Remove bookmark
    user.bookmarks = user.bookmarks.filter(id => id !== articleId);
    await user.save();
    
    res.json({ message: 'Bookmark removed successfully', bookmarks: user.bookmarks });
  } catch (err) {
    console.error('Remove bookmark error:', err);
    res.status(500).json({ error: 'Failed to remove bookmark' });
  }
});

// GET /api/v1/users/:username/bookmarks
router.get('/:username/bookmarks', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ bookmarks: user.bookmarks || [] });
  } catch (err) {
    console.error('Get bookmarks error:', err);
    res.status(500).json({ error: 'Failed to get bookmarks' });
  }
});

// POST /api/v1/contact
router.post('/contact', async (req, res) => {
  const { subject, message } = req.body;
  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and message are required.' });
  }
  try {
    const msg = {
      to: process.env.SENDGRID_FROM_EMAIL,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: `[Contact Us] ${subject}`,
      text: message,
      html: `<p>${message.replace(/\n/g, '<br/>')}</p>`
    };
    await sgMail.send(msg);
    res.json({ message: 'Message sent successfully.' });
  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

module.exports = router; 