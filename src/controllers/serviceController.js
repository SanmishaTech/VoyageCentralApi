const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors"); // For consistent error handling

// Get all services with pagination, sorting, and search
const getServices = async (req, res, next) => {
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
      serviceName: { contains: search },
    };

    const services = await prisma.service.findMany({
      where: whereClause,
      select: {
        id: true,
        serviceName: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    const totalServices = await prisma.service.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalServices / limit);

    res.json({
      services,
      page,
      totalPages,
      totalServices,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch services",
        details: error.message,
      },
    });
  }
};

// Create a new service
const createService = async (req, res, next) => {
  const schema = z
    .object({
      serviceName: z
        .string()
        .min(1, "Service name cannot be left blank.")
        .max(100, "Service name must not exceed 100 characters."),
    })
    .superRefine(async (data, ctx) => {
      if (!req.user.agencyId) {
        return res
          .status(404)
          .json({ message: "User does not belong to any Agency" });
      }
      const existingService = await prisma.service.findFirst({
        where: {
          AND: [
            { serviceName: data.serviceName },
            { agencyId: parseInt(req.user.agencyId) },
          ],
        },
      });

      if (existingService) {
        ctx.addIssue({
          path: ["serviceName"],
          message: `Service with name ${data.serviceName} already exists.`,
        });
      }
    });

  const validationErrors = await validateRequest(schema, req.body, res);

  try {
    const { serviceName } = req.body;

    const newService = await prisma.service.create({
      data: { serviceName, agencyId: req.user.agencyId },
    });

    res.status(201).json(newService);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to create service",
        details: error.message,
      },
    });
  }
};

// Get a service by ID
const getServiceById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const service = await prisma.service.findFirst({
      where: {
        AND: [
          { id: parseInt(id, 10) },
          { agencyId: parseInt(req.user.agencyId) },
        ],
      },
    });

    if (!service) {
      return res.status(404).json({ errors: { message: "Service not found" } });
    }

    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch service",
        details: error.message,
      },
    });
  }
};

// Update a service
const updateService = async (req, res, next) => {
  const schema = z
    .object({
      serviceName: z
        .string()
        .min(1, "Service name cannot be left blank.")
        .max(100, "Service name must not exceed 100 characters."),
    })
    .superRefine(async (data, ctx) => {
      if (!req.user.agencyId) {
        return res
          .status(404)
          .json({ message: "User does not belong to any Agency" });
      }
      const { id } = req.params;

      const existingService = await prisma.service.findFirst({
        where: {
          AND: [
            { serviceName: data.serviceName },
            { agencyId: parseInt(req.user.agencyId) },
          ],
        },
        select: { id: true },
      });

      if (existingService && existingService.id !== parseInt(id)) {
        ctx.addIssue({
          path: ["serviceName"],
          message: `Service with name ${data.serviceName} already exists.`,
        });
      }
    });

  const validationErrors = await validateRequest(schema, req.body, res);

  const { id } = req.params;
  const { serviceName } = req.body;

  try {
    const updatedService = await prisma.service.update({
      where: { id: parseInt(id, 10) },
      data: { serviceName },
    });

    res.status(200).json(updatedService);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "Service not found" } });
    }
    return res.status(500).json({
      errors: {
        message: "Failed to update service",
        details: error.message,
      },
    });
  }
};

// Delete a service
const deleteService = async (req, res, next) => {
  const { id } = req.params;

  try {
    await prisma.service.delete({
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
            "Cannot delete this Service because it is referenced in related data. Please remove the related references before deleting.",
        },
      });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "Service not found" } });
    }
    res.status(500).json({
      errors: {
        message: "Failed to delete service",
        details: error.message,
      },
    });
  }
};

// Get all services without pagination, sorting, and search
const getAllServices = async (req, res, next) => {
  try {
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: "User does not belong to any Agency" });
    }

    const services = await prisma.service.findMany({
      where: {
        agencyId: req.user.agencyId,
      },
      select: {
        id: true,
        serviceName: true,
      },
    });

    res.status(200).json(services);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch services",
        details: error.message,
      },
    });
  }
};

module.exports = {
  getServices,
  createService,
  getServiceById,
  updateService,
  deleteService,
  getAllServices,
};
