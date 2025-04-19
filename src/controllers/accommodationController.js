const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors"); // For consistent error handling

// Get all accommodations with pagination, sorting, and search
const getAccommodations = async (req, res, next) => {
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
      accommodationName: { contains: search },
    };

    const accommodations = await prisma.accommodation.findMany({
      where: whereClause,
      select: {
        id: true,
        accommodationName: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    const totalAccommodations = await prisma.accommodation.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalAccommodations / limit);

    res.json({
      accommodations,
      page,
      totalPages,
      totalAccommodations,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch accommodation",
        details: error.message,
      },
    });
  }
};

// Create a new accommodation
const createAccommodation = async (req, res, next) => {
  const schema = z
    .object({
      accommodationName: z
        .string()
        .min(1, "Accommodation name cannot be left blank.")
        .max(100, "Accommodation name must not exceed 100 characters."),
    })
    .superRefine(async (data, ctx) => {
      if (!req.user.agencyId) {
        return res
          .status(404)
          .json({ message: "User does not belong to any Agency" });
      }
      const existingAccommodation = await prisma.accommodation.findFirst({
        where: {
          AND: [
            { accommodationName: data.accommodationName },
            { agencyId: parseInt(req.user.agencyId) },
          ],
        },
      });

      if (existingAccommodation) {
        ctx.addIssue({
          path: ["accommodationName"],
          message: `Accommodation with name ${data.accommodationName} already exists.`,
        });
      }
    });

  const validationErrors = await validateRequest(schema, req.body, res);

  try {
    const { accommodationName } = req.body;

    const newAccommodation = await prisma.accommodation.create({
      data: { accommodationName, agencyId: req.user.agencyId },
    });

    res.status(201).json(newAccommodation);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to Create accommodation",
        details: error.message,
      },
    });
  }
};

// Get an accommodation by ID
const getAccommodationById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const accommodation = await prisma.accommodation.findFirst({
      where: {
        AND: [
          { id: parseInt(id, 10) },
          { agencyId: parseInt(req.user.agencyId) },
        ],
      },
    });

    if (!accommodation) {
      return res
        .status(404)
        .json({ errors: { message: "Accommodation not found" } });
    }

    res.status(200).json(accommodation);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch accommodation",
        details: error.message,
      },
    });
  }
};

// Update an accommodation
const updateAccommodation = async (req, res, next) => {
  const schema = z
    .object({
      accommodationName: z
        .string()
        .min(1, "Accommodation name cannot be left blank.")
        .max(100, "Accommodation name must not exceed 100 characters."),
    })
    .superRefine(async (data, ctx) => {
      if (!req.user.agencyId) {
        return res
          .status(404)
          .json({ message: "User does not belong to any Agency" });
      }
      const { id } = req.params;

      const existingAccommodation = await prisma.accommodation.findFirst({
        where: {
          AND: [
            { accommodationName: data.accommodationName },
            { agencyId: parseInt(req.user.agencyId) },
          ],
        },
        select: { id: true },
      });

      if (existingAccommodation && existingAccommodation.id !== parseInt(id)) {
        ctx.addIssue({
          path: ["accommodationName"],
          message: `Accommodation with name ${data.accommodationName} already exists.`,
        });
      }
    });

  const validationErrors = await validateRequest(schema, req.body, res);

  const { id } = req.params;
  const { accommodationName } = req.body;

  try {
    const updatedAccommodation = await prisma.accommodation.update({
      where: { id: parseInt(id, 10) },
      data: { accommodationName },
    });

    res.status(200).json(updatedAccommodation);
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ errors: { message: "Accommodation not found" } });
    }
    return res.status(500).json({
      errors: {
        message: "Failed to update accommodation",
        details: error.message,
      },
    });
  }
};

// Delete an accommodation
const deleteAccommodation = async (req, res, next) => {
  const { id } = req.params;

  try {
    await prisma.accommodation.delete({
      where: { id: parseInt(id, 10) },
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ errors: { message: "Accommodation not found" } });
    }
    res.status(500).json({
      errors: {
        message: "Failed to delete accommodation",
        details: error.message,
      },
    });
  }
};

// Get all accommodations without pagination, sorting, and search
const getAllAccommodations = async (req, res, next) => {
  try {
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: "User does not belong to any Agency" });
    }

    const accommodations = await prisma.accommodation.findMany({
      where: {
        agencyId: req.user.agencyId,
      },
      select: {
        id: true,
        accommodationName: true,
      },
    });

    res.status(200).json(accommodations);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch accommodation",
        details: error.message,
      },
    });
  }
};

module.exports = {
  getAccommodations,
  createAccommodation,
  getAccommodationById,
  updateAccommodation,
  deleteAccommodation,
  getAllAccommodations,
};
