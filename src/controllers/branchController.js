const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors");

// Create a new branch
const createBranch = async (req, res, next) => {
  const schema = z
    .object({
      agencyId: z.number().int("Agency ID must be an integer."),
      branchName: z.string().nonempty("Branch name is required."),
      address: z.string().nonempty("Address is required."),
      contactName: z.string().nonempty("Contact name is required."),
      contactEmail: z
        .string()
        .email("Contact email must be a valid email address.")
        .nonempty("Contact email is required."),
      contactMobile: z.string().nonempty("Contact mobile is required."),
    })
    .superRefine(async (data, ctx) => {
      // Check if the agency exists
      const existingAgency = await prisma.agency.findUnique({
        where: { id: data.agencyId },
      });

      if (!existingAgency) {
        ctx.addIssue({
          path: ["agencyId"],
          message: `Agency with ID ${data.agencyId} does not exist.`,
        });
      }
    });

  try {
    const validationErrors = await validateRequest(schema, req.body, res);

    const {
      agencyId,
      branchName,
      address,
      contactName,
      contactEmail,
      contactMobile,
    } = req.body;

    const newBranch = await prisma.branch.create({
      data: {
        agencyId,
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

// Get all branches
const getAllBranches = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const branches = await prisma.branch.findMany({
      skip: skip,
      take: limit,
      include: {
        agency: {
          select: {
            businessName: true,
          },
        },
      },
    });

    const totalBranches = await prisma.branch.count();
    const totalPages = Math.ceil(totalBranches / limit);

    res.json({
      data: branches,
      page: page,
      totalPages: totalPages,
      totalBranches: totalBranches,
    });
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
  const schema = z
    .object({
      agencyId: z.number().int("Agency ID must be an integer.").optional(),
      branchName: z.string().nonempty("Branch name is required.").optional(),
      address: z.string().nonempty("Address is required.").optional(),
      contactName: z.string().nonempty("Contact name is required.").optional(),
      contactEmail: z
        .string()
        .email("Contact email must be a valid email address.")
        .nonempty("Contact email is required")
        .optional(),
      contactMobile: z
        .string()
        .nonempty("Contact mobile is required.")
        .optional(),
    })
    .superRefine(async (data, ctx) => {
      if (data.agencyId) {
        const existingAgency = await prisma.agency.findUnique({
          where: { id: data.agencyId },
        });

        if (!existingAgency) {
          ctx.addIssue({
            path: ["agencyId"],
            message: `Agency with ID ${data.agencyId} does not exist.`,
          });
        }
      }
    });

  try {
    const validationErrors = await validateRequest(schema, req.body, res);

    const { id } = req.params;
    const {
      agencyId,
      branchName,
      address,
      contactName,
      contactEmail,
      contactMobile,
    } = req.body;

    const updatedBranch = await prisma.branch.update({
      where: { id: parseInt(id, 10) },
      data: {
        ...(agencyId && { agencyId }),
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
  getAllBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
};
