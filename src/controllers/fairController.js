const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors"); // For consistent error handling

// Get all fairs with pagination, sorting, and search
const getFairs = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

  try {
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: "User does not belong to any Agency" });
    }

    const whereClause = {
      agencyId: req.user.agencyId,
      fairName: { contains: search },
    };

    const fairs = await prisma.fair.findMany({
      where: whereClause,
      select: {
        id: true,
        fairName: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    const totalFairs = await prisma.fair.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalFairs / limit);

    res.json({
      fairs,
      page,
      totalPages,
      totalFairs,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch fairs",
        details: error.message,
      },
    });
  }
};

// Create a new fair
const createFair = async (req, res, next) => {
  const schema = z
    .object({
      fairName: z
        .string()
        .min(1, "Fair name cannot be left blank.")
        .max(100, "Fair name must not exceed 100 characters."),
    })
    .superRefine(async (data, ctx) => {
      if (!req.user.agencyId) {
        return res
          .status(404)
          .json({ message: "User does not belong to any Agency" });
      }
      const existingFair = await prisma.fair.findFirst({
        where: {
          AND: [
            { fairName: data.fairName },
            { agencyId: parseInt(req.user.agencyId) },
          ],
        },
      });

      if (existingFair) {
        ctx.addIssue({
          path: ["fairName"],
          message: `Fair with name ${data.fairName} already exists.`,
        });
      }
    });

  const validationErrors = await validateRequest(schema, req.body, res);

  try {
    const { fairName } = req.body;

    const newFair = await prisma.fair.create({
      data: { fairName, agencyId: req.user.agencyId },
    });

    res.status(201).json(newFair);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to create fair",
        details: error.message,
      },
    });
  }
};

// Get a fair by ID
const getFairById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const fair = await prisma.fair.findFirst({
      where: {
        AND: [
          { id: parseInt(id, 10) },
          { agencyId: parseInt(req.user.agencyId) },
        ],
      },
    });

    if (!fair) {
      return res.status(404).json({ errors: { message: "Fair not found" } });
    }

    res.status(200).json(fair);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch fair",
        details: error.message,
      },
    });
  }
};

// Update a fair
const updateFair = async (req, res, next) => {
  const schema = z
    .object({
      fairName: z
        .string()
        .min(1, "Fair name cannot be left blank.")
        .max(100, "Fair name must not exceed 100 characters."),
    })
    .superRefine(async (data, ctx) => {
      if (!req.user.agencyId) {
        return res
          .status(404)
          .json({ message: "User does not belong to any Agency" });
      }
      const { id } = req.params;

      const existingFair = await prisma.fair.findFirst({
        where: {
          AND: [
            { fairName: data.fairName },
            { agencyId: parseInt(req.user.agencyId) },
          ],
        },
        select: { id: true },
      });

      if (existingFair && existingFair.id !== parseInt(id)) {
        ctx.addIssue({
          path: ["fairName"],
          message: `Fair with name ${data.fairName} already exists.`,
        });
      }
    });

  const validationErrors = await validateRequest(schema, req.body, res);

  const { id } = req.params;
  const { fairName } = req.body;

  try {
    const updatedFair = await prisma.fair.update({
      where: { id: parseInt(id, 10) },
      data: { fairName },
    });

    res.status(200).json(updatedFair);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "Fair not found" } });
    }
    return res.status(500).json({
      errors: {
        message: "Failed to update fair",
        details: error.message,
      },
    });
  }
};

// Delete a fair
const deleteFair = async (req, res, next) => {
  const { id } = req.params;

  try {
    await prisma.fair.delete({
      where: { id: parseInt(id, 10) },
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "Fair not found" } });
    }
    res.status(500).json({
      errors: {
        message: "Failed to delete fair",
        details: error.message,
      },
    });
  }
};

// Get all fairs without pagination, sorting, and search
const getAllFairs = async (req, res, next) => {
  try {
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: "User does not belong to any Agency" });
    }

    const fairs = await prisma.fair.findMany({
      where: {
        agencyId: req.user.agencyId,
      },
      select: {
        id: true,
        fairName: true,
      },
    });

    res.status(200).json(fairs);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch fairs",
        details: error.message,
      },
    });
  }
};

module.exports = {
  getFairs,
  createFair,
  getFairById,
  updateFair,
  deleteFair,
  getAllFairs,
};
