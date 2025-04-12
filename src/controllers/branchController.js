const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors");

// Get all branches
const getBranches = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

  try {
    // Step 1: Get agencyId of the current user
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: "User does not belongs to any Agency" });
    }

    // Step 2: Build filter clause
    const whereClause = {
      agencyId: req.user.agencyId,
      OR: [
        { branchName: { contains: search } },
        { address: { contains: search } },
        { contactName: { contains: search } },
        { contactEmail: { contains: search } },
        { contactMobile: { contains: search } },
      ],
    };

    // Step 3: Fetch paginated & sorted countries
    const branches = await prisma.branch.findMany({
      where: whereClause,
      select: {
        id: true,
        branchName: true,
        address: true,
        contactName: true,
        contactEmail: true,
        contactMobile: true,
        agency: {
          select: {
            id: true,
            businessName: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    const totalBranches = await prisma.branch.count({ where: whereClause });
    const totalPages = Math.ceil(totalBranches / limit);

    res.json({
      branches,
      page,
      totalPages,
      totalBranches,
    });
  } catch (error) {
    next(error);
  }
};

// Create a new branch
const createBranch = async (req, res, next) => {
  const schema = z.object({
    branchName: z
      .string()
      .min(1, "Branch name is required.")
      .max(100, "Branch name must be less than 100 characters."),
    address: z
      .string()
      .min(1, "Address is required.")
      .max(255, "Address must be less than 255 characters."),
    contactName: z
      .string()
      .min(1, "Name cannot be left blank.") // Ensuring minimum length of 2
      .max(100, "Name must not exceed 100 characters.")
      .refine((val) => /^[A-Za-z\s\u0900-\u097F]+$/.test(val), {
        message: "Name can only contain letters.",
      }),
    contactEmail: z
      .string()
      .email("Contact email must be a valid email address.")
      .nonempty("Contact email is required."),
    contactMobile: z
      .string()
      .min(10, "Contact number must be 10 digits.")
      .max(10, "Contact number must be 10 digits."),
  });

  try {
    const validationErrors = await validateRequest(schema, req.body, res);

    const { branchName, address, contactName, contactEmail, contactMobile } =
      req.body;

    if (!req.user.agencyId) {
      return res.status(400).json({
        errors: { message: "User does not belong to any agency." },
      });
    }

    const newBranch = await prisma.branch.create({
      data: {
        agencyId: req.user.agencyId,
        branchName,
        address,
        contactName,
        contactEmail,
        contactMobile,
      },
    });

    res.status(201).json(newBranch);
  } catch (error) {
    next(error);
  }
};

// Get a branch by ID
const getBranchById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const branch = await prisma.branch.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        agency: {
          select: {
            businessName: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!branch) {
      return next(createError(404, "Branch not found"));
    }

    res.json(branch);
  } catch (error) {
    next(error);
  }
};

// Update a branch
const updateBranch = async (req, res, next) => {
  const schema = z.object({
    branchName: z
      .string()
      .min(1, "Branch name is required.")
      .max(100, "Branch name must be less than 100 characters."),
    address: z
      .string()
      .min(1, "Address is required.")
      .max(255, "Address must be less than 255 characters."),
    contactName: z
      .string()
      .min(1, "Name cannot be left blank.") // Ensuring minimum length of 2
      .max(100, "Name must not exceed 100 characters.")
      .refine((val) => /^[A-Za-z\s\u0900-\u097F]+$/.test(val), {
        message: "Name can only contain letters.",
      }),
    contactEmail: z
      .string()
      .email("Contact email must be a valid email address.")
      .nonempty("Contact email is required."),
    contactMobile: z
      .string()
      .min(10, "Contact number must be 10 digits.")
      .max(10, "Contact number must be 10 digits."),
  });

  try {
    const validationErrors = await validateRequest(schema, req.body, res);

    const { id } = req.params;
    const { branchName, address, contactName, contactEmail, contactMobile } =
      req.body;

    const updatedBranch = await prisma.branch.update({
      where: { id: parseInt(id, 10) },
      data: {
        ...(branchName && { branchName }),
        ...(address && { address }),
        ...(contactName && { contactName }),
        ...(contactEmail && { contactEmail }),
        ...(contactMobile && { contactMobile }),
      },
    });

    res.json(updatedBranch);
  } catch (error) {
    if (error.code === "P2025") {
      return next(createError(404, "Branch not found"));
    }
    next(error);
  }
};

// Delete a branch
const deleteBranch = async (req, res, next) => {
  const { id } = req.params;

  try {
    await prisma.branch.delete({
      where: { id: parseInt(id, 10) },
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "Branch not found" } });
    }
    res.status(500).json({
      errors: { message: "Failed to delete branch", details: error.message },
    });
  }
};

module.exports = {
  createBranch,
  getBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
};
