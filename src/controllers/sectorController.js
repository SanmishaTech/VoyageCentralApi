const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors"); // For consistent error handling

// Get all sectors with pagination, sorting, and search
const getSectors = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

  try {
    // Fetch sectors with optional pagination, sorting, and search
    const whereClause = {
      sectorName: { contains: search },
    };

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

    // Fetch total count for pagination
    const totalSectors = await prisma.sector.count({ where: whereClause });
    const totalPages = Math.ceil(totalSectors / limit);

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
      // Check if the sector already exists
      const existingSector = await prisma.sector.findUnique({
        where: { sectorName: data.sectorName },
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

    const agencyId = await prisma.user.findUnique({
      where: { id: parseInt(req.user.id) },
      select: { agencyId: true },
    });

    if (!agencyId.agencyId) {
      return res
        .status(404)
        .json({ errors: { message: "User does not belongs to any Agency" } });
    }

    const newSector = await prisma.sector.create({
      data: { sectorName, agencyId: agencyId.agencyId },
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
    next(error);
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

      // Check if the sector already exists
      const existingSector = await prisma.sector.findUnique({
        where: { sectorName: data.sectorName },
        select: { id: true },
      });

      if (existingSector && existingSector.id !== parseInt(id)) {
        ctx.addIssue({
          path: ["sectorName"],
          message: `Sector with name ${data.sectorName} already exists.`,
        });
      }
    });

  // Validate the request body using Zod
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
    next(error);
  }
};

// Get all sectors without pagination, sorting, and search
const getAllSectors = async (req, res, next) => {
  try {
    const sectors = await prisma.sector.findMany({
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
