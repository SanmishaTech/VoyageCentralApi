const bcrypt = require('bcrypt');
const Joi = require('joi');
const prisma = require('../config/db');
const validateRequest = require('../utils/validation');

const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id; // Assuming `req.user` contains the authenticated user's data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ errors: { message: 'User not found' } });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().optional(),
    email: Joi.string().email().optional(),
  });

  try {
    validateRequest(schema, req);

    const userId = req.user.id; // Assuming `req.user` contains the authenticated user's data
    const { name, email } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ errors: { message: 'Email already exists' } });
    }
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  const schema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required(),
  });

  try {
    validateRequest(schema, req);

    const userId = req.user.id; // Assuming `req.user` contains the authenticated user's data
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ errors: { message: 'User not found' } });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ errors: { message: 'Current password is incorrect' } });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
};
