const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const createError = require("http-errors");
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");

// Get all sectors with pagination, sorting, and search
const getSectors = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

  try {
    // Step 1: Get agencyId of the current user
    if (!req.user.agencyId) {
      return res.status(404).json({
        errors: {
          message: "User does not belongs to any Agency",
        },
      });
    }

    // Step 2: Build filter clause
    const whereClause = {
      agencyId: req.user.agencyId,
      sectorName: { contains: search },
    };

    // Step 3: Fetch paginated & sorted countries
    const sectors = await prisma.sector.findMany({
      where: whereClause,
      select: {
        id: true,
        sectorName: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    // Step 4: Get total count for pagination
    const totalSectors = await prisma.sector.count({ where: whereClause });
    const totalPages = Math.ceil(totalSectors / limit);

    // end

    res.json({
      sectors,
      page,
      totalPages,
      totalSectors,
    });
  } catch (error) {
    next(error);
  }
};

// Create a new sector
const createSector = async (req, res, next) => {
  // Define Zod schema for sector creation
  const schema = z
    .object({
      sectorName: z
        .string()
        .min(1, "Sector name is required.")
        .max(100, "Sector name must be less than 100 characters."),
    })
    .superRefine(async (data, ctx) => {
      if (!req.user.agencyId) {
        return res.status(404).json({
          errors: {
            message: "User does not belongs to any Agency",
          },
        });
      }

      const existingSector = await prisma.sector.findFirst({
        where: {
          AND: [
            { sectorName: data.sectorName },
            { agencyId: parseInt(req.user.agencyId) },
          ],
        },
      });

      if (existingSector) {
        ctx.addIssue({
          path: ["sectorName"],
          message: `Sector with name ${data.sectorName} already exists.`,
        });
      }
    });

  // Validate the request body using Zod
  const validationErrors = await validateRequest(schema, req.body, res);

  try {
    const { sectorName } = req.body;

    const newSector = await prisma.sector.create({
      data: { sectorName, agencyId: req.user.agencyId },
    });

    res.status(201).json(newSector);
  } catch (error) {
    next(error);
  }
};

// Get a sector by ID
const getSectorById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const sector = await prisma.sector.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!sector) {
      return res.status(404).json({ errors: { message: "Sector not found" } });
    }

    res.status(200).json(sector);
  } catch (error) {
    res.status(500).json({
      errors: { message: "Failed to fetch sector", details: error.message },
    });
  }
};

// Update a sector
const updateSector = async (req, res, next) => {
  // Define Zod schema for sector update
  const schema = z
    .object({
      sectorName: z
        .string()
        .min(1, "Sector name is required.")
        .max(100, "Sector name must be less than 100 characters."),
    })
    .superRefine(async (data, ctx) => {
      const { id } = req.params;
      if (!req.user.agencyId) {
        return res.status(404).json({
          errors: {
            message: "User does not belongs to any Agency",
          },
        });
      }

      const existingSector = await prisma.sector.findFirst({
        where: {
          AND: [
            { sectorName: data.sectorName },
            { agencyId: parseInt(req.user.agencyId) },
          ],
        },
        select: { id: true }, // We only need the id to compare
      });

      if (existingSector && existingSector.id !== parseInt(id)) {
        ctx.addIssue({
          path: ["sectorName"],
          message: `Sector with name ${data.sectorName} already exists.`,
        });
      }
    });

  const validationErrors = await validateRequest(schema, req.body, res);

  const { id } = req.params;
  const { sectorName } = req.body;

  try {
    const updatedSector = await prisma.sector.update({
      where: { id: parseInt(id, 10) },
      data: { sectorName },
    });

    res.status(200).json(updatedSector);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        errors: {
          message: "Sector not found",
        },
      });
    }
    next(error);
  }
};

// Delete a sector
const deleteSector = async (req, res, next) => {
  const { id } = req.params;

  try {
    await prisma.sector.delete({
      where: { id: parseInt(id, 10) },
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "Sector not found" } });
    }
    res.status(500).json({
      errors: { message: "Failed to delete sector", details: error.message },
    });
  }
};

// Get all sectors without pagination, sorting, and search
const getAllSectors = async (req, res, next) => {
  try {
    if (!req.user.agencyId) {
      return res.status(404).json({
        errors: {
          message: "User does not belongs to any Agency",
        },
      });
    }
    const sectors = await prisma.sector.findMany({
      where: { agencyId: req.user.agencyId },
      select: {
        id: true,
        sectorName: true,
      },
    });

    res.status(200).json(sectors);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSectors,
  createSector,
  getSectorById,
  updateSector,
  deleteSector,
  getAllSectors,
};
