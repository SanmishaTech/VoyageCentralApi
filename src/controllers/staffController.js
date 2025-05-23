const createError = require("http-errors");
const bcrypt = require("bcrypt");
const ExcelJS = require("exceljs");
const prisma = require("../config/db");
const roles = require("../config/roles");
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const dayjs = require("dayjs");

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
          // { email: { contains: search } },
          { communicationEmail: { contains: search } },
          { mobile1: { contains: search } },
          // { mobile2: { contains: search } },
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
    if (error.name === "UnauthorizedError") {
      return res.status(401).json({
        errors: {
          auth: {
            type: "server",
            message: "Unauthorized access",
          },
        },
      });
    }
    return res.status(500).json({
      errors: {
        server: {
          type: "server",
          message: error.message || "Internal server error",
        },
      },
    });
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
        dateOfBirth: true,
        address: true,
        bloodGroup: true,
        gender: true,
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
    if (error.name === "UnauthorizedError") {
      return res.status(401).json({
        errors: {
          auth: {
            type: "server",
            message: "Unauthorized access",
          },
        },
      });
    }
    next(error);
  }
};

const createStaff = async (req, res, next) => {
  const schema = z
    .object({
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
      branchId: z.string().optional(),
    })
    .superRefine(async (data, ctx) => {
      if (!req.user.agencyId) {
        return res
          .status(404)
          .json({ message: "User does not belong to any Agency" });
      }

      const userRole = req.user.role;

      if (
        userRole === roles.ADMIN &&
        (!data.branchId || data.branchId.trim() === "")
      ) {
        ctx.addIssue({
          path: ["branchId"],
          code: z.ZodIssueCode.custom,
          message: "Branch ID is required for admin users.",
        });
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: req.body.email },
      });

      if (existingUser) {
        ctx.addIssue({
          path: ["email"],
          message: `Email already exists.`,
        });
      }
    });

  try {
    const validationErrors = await validateRequest(schema, req.body, res);

    let branchId = null;
    if (req.user.role === roles.ADMIN) {
      branchId = req.body.branchId;
    } else {
      branchId = req.user.branchId;
    }

    const parseDate = (value) => {
      if (typeof value !== "string" || value.trim() === "") return undefined;
      return dayjs(value).isValid() ? new Date(value) : undefined;
    };
    // start
    const packageData = await prisma.agency.findUnique({
      where: { id: parseInt(req.user.agencyId) },
      include: {
        currentSubscription: {
          include: {
            package: true, // ✅ Correct usage of nested include
          },
        },
      },
    });
    const usersPerBranch =
      packageData?.currentSubscription?.package?.usersPerBranch || 0;

    const branchData = await prisma.branch.findUnique({
      where: { id: parseInt(branchId) },
      include: {
        users: true,
      },
    });

    const totalUsers = branchData?.users?.length || 0;

    if (totalUsers >= usersPerBranch) {
      return res.status(500).json({
        errors: {
          message: "User limit reached for your package.",
        },
      });
    }

    // end
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const staff = await prisma.user.create({
      data: {
        ...req.body,
        password: hashedPassword,
        agencyId: req.user.agencyId,
        branchId: parseInt(branchId),
        dateOfBirth: parseDate(req.body.dateOfBirth),
      },
    });

    return res.status(201).json({
      status: "success",
      message: "Staff created successfully",
      data: staff,
    });
  } catch (error) {
    if (error.name === "UnauthorizedError") {
      return res.status(401).json({
        errors: {
          auth: {
            type: "server",
            message: "Unauthorized access",
          },
        },
      });
    }
    return res.status(500).json({
      errors: {
        server: {
          type: "server",
          message: error.message || "Internal server error",
        },
      },
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
    branchId: z.string().min(1, "Branch field is required"),
  });

  try {
    const validationErrors = await validateRequest(schema, req.body, res);
    const parseDate = (value) => {
      if (typeof value !== "string" || value.trim() === "") return undefined;
      return dayjs(value).isValid() ? new Date(value) : undefined;
    };
    // Check if email exists (if email is being updated)
    if (req.body.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: req.body.email,
          id: { not: parseInt(req.params.id) },
        },
      });

      if (existingUser) {
        return res.status(400).json({
          errors: {
            email: {
              type: "server",
              message: "Email already exists.",
            },
          },
        });
      }
    }

    // start
    const packageData = await prisma.agency.findUnique({
      where: { id: parseInt(req.user.agencyId) },
      include: {
        currentSubscription: {
          include: {
            package: true, // ✅ Correct usage of nested include
          },
        },
      },
    });
    const usersPerBranch =
      packageData?.currentSubscription?.package?.usersPerBranch || 0;

    const branchData = await prisma.branch.findUnique({
      where: { id: parseInt(req.body.branchId) },
      include: {
        users: true,
      },
    });

    const totalUsers = branchData?.users?.length || 0;

    let isUserInBranch = false;

    // Check if user with the same email already exists in the branch
    if (req.body.email) {
      const existingBranchUser = await prisma.user.findFirst({
        where: {
          email: req.body.email,
          branchId: parseInt(req.body.branchId),
        },
      });

      if (existingBranchUser) {
        isUserInBranch = true;
      }
    }

    // Enforce limit only if the user is not already part of the branch
    if (!isUserInBranch && totalUsers >= usersPerBranch) {
      return res.status(500).json({
        errors: {
          message: "User limit reached for your package.",
        },
      });
    }

    // if (totalUsers >= usersPerBranch) {
    //   return res.status(500).json({
    //     errors: {
    //       message: "User limit reached for your package.",
    //     },
    //   });
    // }

    // end

    let branchId = null;
    if (req.user.role === roles.ADMIN) {
      branchId = req.body.branchId;
    } else {
      branchId = req.user.branchId;
    }

    const updatedStaff = await prisma.user.update({
      where: {
        id: parseInt(req.params.id),
        agencyId: req.user.agencyId,
      },
      data: {
        ...req.body,
        branchId: parseInt(branchId),
        dateOfBirth: parseDate(req.body.dateOfBirth),
      },
    });

    res.json(updatedStaff);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        errors: {
          staff: {
            type: "server",
            message: "Staff member not found",
          },
        },
      });
    }
    if (error.name === "UnauthorizedError") {
      return res.status(401).json({
        errors: {
          auth: {
            type: "server",
            message: "Unauthorized access",
          },
        },
      });
    }
    return res.status(500).json({
      errors: {
        server: {
          type: "server",
          message: error.message || "Internal server error",
        },
      },
    });
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
    if (
      error.code === "P2003" ||
      error.message.includes("Foreign key constraint failed")
    ) {
      return res.status(409).json({
        errors: {
          message:
            "Cannot delete this Staff because it is referenced in related data. Please remove the related references before deleting.",
        },
      });
    }
    if (error.name === "UnauthorizedError") {
      return res.status(401).json({
        errors: {
          auth: {
            type: "server",
            message: "Unauthorized access",
          },
        },
      });
    }
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  // Define Zod schema for password validation
  const schema = z.object({
    password: z
      .string()
      .min(6, "Password must be at least 6 characters long.")
      .nonempty("Password is required."),
  });

  try {
    // Validate the request body using Zod
    const validationErrors = await validateRequest(schema, req.body, res);
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const updatedStaff = await prisma.user.update({
      where: {
        id: parseInt(req.params.id),
        agencyId: req.user.agencyId, // Ensure staff belongs to agency
      },
      data: { password: hashedPassword },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        errors: { message: "Staff member not found" },
      });
    }
    next(error);
  }
};

const setActiveStatus = async (req, res, next) => {
  const schema = z.object({
    active: z.boolean({
      required_error: "Active status is required.",
      invalid_type_error: "Active status must be a boolean.",
    }),
  });

  try {
    const validationErrors = await validateRequest(schema, req.body, res);

    const updatedStaff = await prisma.user.update({
      where: {
        id: parseInt(req.params.id),
        agencyId: req.user.agencyId,
      },
      data: { active: req.body.active },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
      },
    });

    res.json(updatedStaff);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Staff member not found" });
    }
    if (error.name === "UnauthorizedError") {
      return res.status(401).json({ message: "Unauthorized access" });
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
  changePassword,
  setActiveStatus,
};
