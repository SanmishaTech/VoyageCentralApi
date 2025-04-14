const createError = require("http-errors");
const bcrypt = require("bcrypt");
const ExcelJS = require("exceljs");
const prisma = require("../config/db");
const validateRequest = require("../utils/validateRequest");
const roles = require("../config/roles");
const { z } = require("zod");

const getStaff = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const active =
    req.query.active === "true"
      ? true
      : req.query.active === "false"
      ? false
      : undefined;
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

  const whereClause = {
    AND: [
      {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
          { communicationEmail: { contains: search } },
          { mobile1: { contains: search } },
          { mobile2: { contains: search } },
        ],
      },
      { agencyId: req.user.agencyId },
      { branchId: { not: null } }, // Add this line to ensure branchId exists
      req.user.branchId ? { branchId: req.user.branchId } : {},
      active !== undefined ? { active } : {},
    ],
  };

  try {
    const staff = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        communicationEmail: true,
        mobile1: true,
        mobile2: true,
        role: true,
        active: true,
        lastLogin: true,
        branchId: true,
        branch: {
          select: {
            branchName: true,
            agency: {
              select: {
                businessName: true, // Changed from agencyName to businessName
              },
            },
          },
        },
      },
      where: whereClause,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    const totalStaff = await prisma.user.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalStaff / limit);

    res.json({
      staff,
      page,
      totalPages,
      totalStaff,
    });
  } catch (error) {
    next(error);
  }
};

const getStaffById = async (req, res, next) => {
  try {
    const staffId = parseInt(req.params.id);

    if (isNaN(staffId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid staff ID",
      });
    }

    const staff = await prisma.user.findFirst({
      where: {
        id: staffId,
        agencyId: req.user.agencyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        communicationEmail: true,
        mobile1: true,
        mobile2: true,
        role: true,
        active: true,
        lastLogin: true,
        branchId: true,
        branch: {
          select: {
            branchName: true,
            agency: {
              select: {
                businessName: true,
              },
            },
          },
        },
      },
    });

    if (!staff) {
      return res.status(404).json({
        status: "error",
        message: "Staff member not found",
      });
    }

    return res.status(200).json({
      status: "success",
      data: staff,
    });
  } catch (error) {
    console.error("Error in getStaffById:", error);
    next(error);
  }
};

const createStaff = async (req, res, next) => {
  const schema = z.object({
    name: z
      .string()
      .min(1, "Name cannot be left blank.")
      .max(100, "Name must not exceed 100 characters.")
      .refine((val) => /^[A-Za-z\s\u0900-\u097F]+$/.test(val), {
        message: "Name can only contain letters.",
      }),
    email: z
      .string()
      .email("Email must be a valid email address.")
      .nonempty("Email is required."),
    communicationEmail: z
      .string()
      .email("Communication email must be a valid email address.")
      .optional()
      .nullable(),
    mobile1: z
      .string()
      .min(10, "Mobile number must be 10 digits")
      .max(10, "Mobile number must be 10 digits")
      .optional()
      .nullable(),
    mobile2: z
      .string()
      .min(10, "Mobile number must be 10 digits")
      .max(10, "Mobile number must be 10 digits")
      .optional()
      .nullable(),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters long.")
      .nonempty("Password is required."),
    role: z.enum(Object.values(roles), "Invalid role."),
    active: z.boolean().optional(),
    branchId: z.number().optional(),
  });

  try {
    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: validation.error.errors.map((error) => ({
          field: error.path.join("."),
          message: error.message,
        })),
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: req.body.email },
    });

    if (existingUser) {
      return res.status(409).json({
        status: "error",
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const staff = await prisma.user.create({
      data: {
        ...req.body,
        password: hashedPassword,
        agencyId: req.user.agencyId,
        branchId: req.user.branchId || req.body.branchId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        communicationEmail: true,
        mobile1: true,
        mobile2: true,
        role: true,
        active: true,
        branchId: true,
      },
    });

    return res.status(201).json({
      status: "success",
      message: "Staff created successfully",
      data: staff,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

const updateStaff = async (req, res, next) => {
  const schema = z.object({
    name: z
      .string()
      .min(1, "Name cannot be left blank.")
      .max(100, "Name must not exceed 100 characters.")
      .refine((val) => /^[A-Za-z\s\u0900-\u097F]+$/.test(val), {
        message: "Name can only contain letters.",
      }),
    email: z.string().email("Email must be a valid email address.").optional(),
    communicationEmail: z
      .string()
      .email("Communication email must be a valid email address.")
      .optional()
      .nullable(),
    mobile1: z
      .string()
      .min(10, "Mobile number must be 10 digits")
      .max(10, "Mobile number must be 10 digits")
      .optional()
      .nullable(),
    mobile2: z
      .string()
      .min(10, "Mobile number must be 10 digits")
      .max(10, "Mobile number must be 10 digits")
      .optional()
      .nullable(),
    role: z.enum(Object.values(roles), "Invalid role."),
    active: z.boolean().optional(),
    branchId: z.number().optional(),
  });

  try {
    const validationErrors = await validateRequest(schema, req.body, res);

    const updatedStaff = await prisma.user.update({
      where: {
        id: parseInt(req.params.id),
        agencyId: req.user.agencyId,
      },
      data: req.body,
    });

    res.json(updatedStaff);
  } catch (error) {
    if (error.code === "P2025") {
      return next(createError(404, "Staff member not found"));
    }
    next(error);
  }
};

const deleteStaff = async (req, res, next) => {
  try {
    await prisma.user.delete({
      where: {
        id: parseInt(req.params.id),
        agencyId: req.user.agencyId,
      },
    });
    res.json({ message: "Staff member deleted" });
  } catch (error) {
    if (error.code === "P2025") {
      return next(createError(404, "Staff member not found"));
    }
    next(error);
  }
};

module.exports = {
  getStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
};
