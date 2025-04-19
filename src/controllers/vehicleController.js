const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors"); // For consistent error handling

// Get all vehicles with pagination, sorting, and search
const getVehicles = async (req, res, next) => {
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
      vehicleName: { contains: search },
    };

    const vehicles = await prisma.vehicle.findMany({
      where: whereClause,
      select: {
        id: true,
        vehicleName: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    const totalVehicles = await prisma.vehicle.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalVehicles / limit);

    res.json({
      vehicles,
      page,
      totalPages,
      totalVehicles,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch vehicles",
        details: error.message,
      },
    });
  }
};

// Create a new vehicle
const createVehicle = async (req, res, next) => {
  const schema = z
    .object({
      vehicleName: z
        .string()
        .min(1, "Vehicle name cannot be left blank.")
        .max(100, "Vehicle name must not exceed 100 characters."),
    })
    .superRefine(async (data, ctx) => {
      if (!req.user.agencyId) {
        return res
          .status(404)
          .json({ message: "User does not belong to any Agency" });
      }
      const existingVehicle = await prisma.vehicle.findFirst({
        where: {
          AND: [
            { vehicleName: data.vehicleName },
            { agencyId: parseInt(req.user.agencyId) },
          ],
        },
      });

      if (existingVehicle) {
        ctx.addIssue({
          path: ["vehicleName"],
          message: `Vehicle with name ${data.vehicleName} already exists.`,
        });
      }
    });

  const validationErrors = await validateRequest(schema, req.body, res);

  try {
    const { vehicleName } = req.body;

    const newVehicle = await prisma.vehicle.create({
      data: { vehicleName, agencyId: req.user.agencyId },
    });

    res.status(201).json(newVehicle);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to create vehicle",
        details: error.message,
      },
    });
  }
};

// Get a vehicle by ID
const getVehicleById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        AND: [
          { id: parseInt(id, 10) },
          { agencyId: parseInt(req.user.agencyId) },
        ],
      },
    });

    if (!vehicle) {
      return res.status(404).json({ errors: { message: "Vehicle not found" } });
    }

    res.status(200).json(vehicle);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch vehicle",
        details: error.message,
      },
    });
  }
};

// Update a vehicle
const updateVehicle = async (req, res, next) => {
  const schema = z
    .object({
      vehicleName: z
        .string()
        .min(1, "Vehicle name cannot be left blank.")
        .max(100, "Vehicle name must not exceed 100 characters."),
    })
    .superRefine(async (data, ctx) => {
      if (!req.user.agencyId) {
        return res
          .status(404)
          .json({ message: "User does not belong to any Agency" });
      }
      const { id } = req.params;

      const existingVehicle = await prisma.vehicle.findFirst({
        where: {
          AND: [
            { vehicleName: data.vehicleName },
            { agencyId: parseInt(req.user.agencyId) },
          ],
        },
        select: { id: true },
      });

      if (existingVehicle && existingVehicle.id !== parseInt(id)) {
        ctx.addIssue({
          path: ["vehicleName"],
          message: `Vehicle with name ${data.vehicleName} already exists.`,
        });
      }
    });

  const validationErrors = await validateRequest(schema, req.body, res);

  const { id } = req.params;
  const { vehicleName } = req.body;

  try {
    const updatedVehicle = await prisma.vehicle.update({
      where: { id: parseInt(id, 10) },
      data: { vehicleName },
    });

    res.status(200).json(updatedVehicle);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "Vehicle not found" } });
    }
    return res.status(500).json({
      errors: {
        message: "Failed to update vehicle",
        details: error.message,
      },
    });
  }
};

// Delete a vehicle
const deleteVehicle = async (req, res, next) => {
  const { id } = req.params;

  try {
    await prisma.vehicle.delete({
      where: { id: parseInt(id, 10) },
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "Vehicle not found" } });
    }
    res.status(500).json({
      errors: {
        message: "Failed to delete vehicle",
        details: error.message,
      },
    });
  }
};

// Get all vehicles without pagination, sorting, and search
const getAllVehicles = async (req, res, next) => {
  try {
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: "User does not belong to any Agency" });
    }

    const vehicles = await prisma.vehicle.findMany({
      where: {
        agencyId: req.user.agencyId,
      },
      select: {
        id: true,
        vehicleName: true,
      },
    });

    res.status(200).json(vehicles);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch vehicles",
        details: error.message,
      },
    });
  }
};

module.exports = {
  getVehicles,
  createVehicle,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  getAllVehicles,
};
