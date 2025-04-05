const createError = require('http-errors');
const Joi = require('joi');
const bcrypt = require('bcrypt');
const ExcelJS = require('exceljs');
const prisma = require('../config/db');
const validateRequest = require('../utils/validation');
const roles = require('../config/roles');
const aclService = require('../services/aclService');

const getAllUsers = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || '';
  const roles = req.query.roles ? req.query.roles.split(',') : []; // Handle multiple roles as a comma-separated string
  const active = req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined;
  const sortBy = req.query.sortBy || 'id';
  const sortOrder = req.query.sortOrder === 'desc' ? 'desc' : 'asc';
  const exportToExcel = req.query.export === 'true'; // Check if export is requested

  // Check if the user has the 'users.export' permission using ACL service
  if (exportToExcel && !aclService.hasPermission(req.user, 'users.export')) {
    return res.status(403).json({ errors: { message: 'You do not have permission to export users' } });
  }

  const whereClause = {
    AND: [
      {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
        ],
      },
      roles.length > 0 ? { role: { in: roles } } : {}, // Filter by multiple roles
      active !== undefined ? { active } : {},
    ],
  };

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        lastLogin: true,
      },
      where: whereClause,
      skip: exportToExcel ? undefined : skip, // Skip pagination if exporting to Excel
      take: exportToExcel ? undefined : limit, // Skip limit if exporting to Excel
      orderBy: exportToExcel ? undefined : { [sortBy]: sortOrder }, // Skip sorting if exporting to Excel
    });

    if (exportToExcel) {
      // Create a new workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Users');

      // Add headers
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Role', key: 'role', width: 15 },
        { header: 'Active', key: 'active', width: 10 },
        { header: 'Last Login', key: 'lastLogin', width: 20 },
      ];

      // Add rows
      users.forEach((user) => {
        worksheet.addRow({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active ? 'Yes' : 'No',
          lastLogin: user.lastLogin ? user.lastLogin.toISOString() : 'N/A',
        });
      });

      // Set response headers for file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');

      // Write the workbook to the response
      await workbook.xlsx.write(res);
      return res.end();
    }

    const totalUsers = await prisma.user.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalUsers / limit);

    res.json({
      users,
      page,
      totalPages,
      totalUsers,
    });

  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!user) {
      return next(createError(404, 'User not found'));
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid(...Object.values(roles)).required(),
    active: Joi.boolean().optional(),
  });

  const validationErrors = validateRequest(schema, req);
  if (validationErrors) {
    return res.status(400).json({ errors: validationErrors });
  }

  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = await prisma.user.create({
      data: {
        ...req.body,
        password: hashedPassword,
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

const updateUser = async (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().optional(),
    email: Joi.string().email().optional(),
    role: Joi.string().valid(...Object.values(roles)).optional(),
    active: Joi.boolean().optional(),
  });

  const validationErrors = validateRequest(schema, req);
  if (validationErrors) {
    return res.status(400).json({ errors: validationErrors });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...req.body,
      },
    });

    res.json(updatedUser);

  } catch (error) {
    if (error.code === 'P2002') {
      return next(createError(400, 'Email already exists'));
    }
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'User deleted' });
  } catch (error) {
    if (error.code === 'P2025') {
      return next(createError(404, 'User not found'));
    }
    next(error);
  }
};

const setActiveStatus = async (req, res, next) => {
  const schema = Joi.object({
    active: Joi.boolean().required(),
  });

  const validationErrors = validateRequest(schema, req);
  if (validationErrors) {
    return res.status(400).json({ errors: validationErrors });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { active: req.body.active },
    });
    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  const schema = Joi.object({
    password: Joi.string().min(6).required(),
  });

  const validationErrors = validateRequest(schema, req);
  if (validationErrors) {
    return res.status(400).json({ errors: validationErrors });
  }

  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { password: hashedPassword },
    });
    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers, getUserById, createUser, updateUser, deleteUser, setActiveStatus, changePassword,
};
