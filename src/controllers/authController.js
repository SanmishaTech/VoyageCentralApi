const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const prisma = require('../config/db');
const emailService = require('../services/emailService');
const validateRequest = require('../utils/validation');
const config = require('../config/config');
const jwtConfig = require('../config/jwt');

const register = async (req, res, next) => {
  if (process.env.ALLOW_REGISTRATION !== 'true') {
    return res.status(403).json({ errors: { message: 'Registration is disabled' } });
  }

  const schema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  });

  try {
    validateRequest(schema, req);

    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: config.defaultUserRole, // Set the default role from the config file
      },
    });
    res.status(201).json(user);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ errors: { message: 'Email already exists' } });
    }
    next(error);
  }
};

const login = async (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });

  try {
    validateRequest(schema, req);

    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ errors: { message: 'Invalid email or password' } });
    }

    if (!user.active) {
      return res.status(403).json({ errors: { message: 'Account is inactive' } });
    }

    // Update lastLogin timestamp using primary key (id)
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = jwt.sign({ userId: user.id }, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn,
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
  });

  try {
    validateRequest(schema, req);

    const { email, resetUrl } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return setTimeout(() => {
        res.status(404).json({ errors: { message: 'User not found' } });
      }, 3000);
    }

    const resetToken = uuidv4();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpires: new Date(Date.now() + 3600000), // Token expires in 1 hour
      },
    });

    const resetLink = `${resetUrl}/${resetToken}`; // Replace with your actual domain
    const templateData = {
      name: user.name,
      resetLink,
      appName: config.appName,
    };
    await emailService.sendEmail(email, 'Password Reset Request', 'passwordReset', templateData);

    res.json({ message: 'Password reset link sent' });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  const schema = Joi.object({
    password: Joi.string().min(6).required(),
  });

  try {
    validateRequest(schema, req);

    const { password } = req.body;
    const { token } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: { gt: new Date() }, // Check if the token is not expired
      },
    });

    if (!user) {
      return res.status(400).json({ errors: { message: 'Invalid or expired token' } });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null, // Clear the token after use
        resetTokenExpires: null,
      },
    });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register, login, forgotPassword, resetPassword,
};
