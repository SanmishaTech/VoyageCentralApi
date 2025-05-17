const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors"); // For consistent error handling

// Get all banks with pagination, sorting, and search
const getBanks = async (req, res, next) => {
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
      bankName: { contains: search },
    };

    const banks = await prisma.bank.findMany({
      where: whereClause,
      select: {
        id: true,
        bankName: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    const totalBanks = await prisma.bank.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalBanks / limit);

    res.json({
      banks,
      page,
      totalPages,
      totalBanks,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch banks",
        details: error.message,
      },
    });
  }
};

// Create a new bank
const createBank = async (req, res, next) => {
  const schema = z
    .object({
      bankName: z
        .string()
        .min(1, "Bank name cannot be left blank.")
        .max(100, "Bank name must not exceed 100 characters."),
    })
    .superRefine(async (data, ctx) => {
      if (!req.user.agencyId) {
        return res
          .status(404)
          .json({ message: "User does not belong to any Agency" });
      }
      const existingBank = await prisma.bank.findFirst({
        where: {
          AND: [
            { bankName: data.bankName },
            { agencyId: parseInt(req.user.agencyId) },
          ],
        },
      });

      if (existingBank) {
        ctx.addIssue({
          path: ["bankName"],
          message: `Bank with name ${data.bankName} already exists.`,
        });
      }
    });

  const validationErrors = await validateRequest(schema, req.body, res);

  try {
    const { bankName } = req.body;

    const newBank = await prisma.bank.create({
      data: { bankName, agencyId: req.user.agencyId },
    });

    res.status(201).json(newBank);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to create bank",
        details: error.message,
      },
    });
  }
};

// Get a bank by ID
const getBankById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const bank = await prisma.bank.findFirst({
      where: {
        AND: [
          { id: parseInt(id, 10) },
          { agencyId: parseInt(req.user.agencyId) },
        ],
      },
    });

    if (!bank) {
      return res.status(404).json({ errors: { message: "Bank not found" } });
    }

    res.status(200).json(bank);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch bank",
        details: error.message,
      },
    });
  }
};

// Update a bank
const updateBank = async (req, res, next) => {
  const schema = z
    .object({
      bankName: z
        .string()
        .min(1, "Bank name cannot be left blank.")
        .max(100, "Bank name must not exceed 100 characters."),
    })
    .superRefine(async (data, ctx) => {
      if (!req.user.agencyId) {
        return res
          .status(404)
          .json({ message: "User does not belong to any Agency" });
      }
      const { id } = req.params;

      const existingBank = await prisma.bank.findFirst({
        where: {
          AND: [
            { bankName: data.bankName },
            { agencyId: parseInt(req.user.agencyId) },
          ],
        },
        select: { id: true },
      });

      if (existingBank && existingBank.id !== parseInt(id)) {
        ctx.addIssue({
          path: ["bankName"],
          message: `Bank with name ${data.bankName} already exists.`,
        });
      }
    });

  const validationErrors = await validateRequest(schema, req.body, res);

  const { id } = req.params;
  const { bankName } = req.body;

  try {
    const updatedBank = await prisma.bank.update({
      where: { id: parseInt(id, 10) },
      data: { bankName },
    });

    res.status(200).json(updatedBank);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "Bank not found" } });
    }
    return res.status(500).json({
      errors: {
        message: "Failed to update bank",
        details: error.message,
      },
    });
  }
};

// Delete a bank
const deleteBank = async (req, res, next) => {
  const { id } = req.params;

  try {
    await prisma.bank.delete({
      where: { id: parseInt(id, 10) },
    });

    res.status(204).send();
  } catch (error) {
    if (
      error.code === "P2003" ||
      error.message.includes("Foreign key constraint failed")
    ) {
      return res.status(409).json({
        errors: {
          message:
            "Cannot delete this Bank because it is referenced in related data. Please remove the related references before deleting.",
        },
      });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "Bank not found" } });
    }
    res.status(500).json({
      errors: {
        message: "Failed to delete bank",
        details: error.message,
      },
    });
  }
};

// Get all banks without pagination, sorting, and search
const getAllBanks = async (req, res, next) => {
  try {
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: "User does not belong to any Agency" });
    }

    const banks = await prisma.bank.findMany({
      where: {
        agencyId: req.user.agencyId,
      },
      select: {
        id: true,
        bankName: true,
      },
    });

    res.status(200).json(banks);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch banks",
        details: error.message,
      },
    });
  }
};

module.exports = {
  getBanks,
  createBank,
  getBankById,
  updateBank,
  deleteBank,
  getAllBanks,
};
