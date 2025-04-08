const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors"); // For consistent error handling

// Get all packages with pagination, sorting, and search
const getPackages = async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sortBy = "id",
    order = "asc",
    search = "",
  } = req.query;

  const skip = (page - 1) * limit;
  const take = parseInt(limit, 10);

  const orderBy = {};
  orderBy[sortBy] = order.toLowerCase() === "desc" ? "desc" : "asc";

  const whereClause = {
    OR: [{ packageName: { contains: search } }],
  };

  try {
    const packages = await prisma.package.findMany({
      where: whereClause,
      skip,
      take,
      orderBy,
    });

    const totalPackages = await prisma.package.count({ where: whereClause });

    res.status(200).json({
      packages: packages,
      meta: {
        total: totalPackages,
        page: parseInt(page, 10),
        limit: take,
        totalPages: Math.ceil(totalPackages / take),
      },
    });
  } catch (error) {
    res.status(500).json({
      errors: { message: "Failed to fetch packages", details: error.message },
    });
  }
};

// Create a new package
const createPackage = async (req, res, next) => {
  // Define Zod schema for package creation
  const schema = z.object({
    packageName: z.string().nonempty("Package name is required."),
    numberOfBranches: z
      .number({
        required_error: "Number of branches is required.",
        invalid_type_error: "Number of branches must be a number.",
      })
      .int("Number of branches must be an integer.")
      .min(1, "Number of branches must be at least 1."),
    usersPerBranch: z
      .number({
        required_error: "Users per branch is required.",
        invalid_type_error: "Users per branch must be a number.",
      })
      .int("Users per branch must be an integer.")
      .min(1, "Users per branch must be at least 1."),
    periodInMonths: z
      .number({
        required_error: "Period in months is required.",
        invalid_type_error: "Period in months must be a number.",
      })
      .int("Period in months must be an integer.")
      .min(1, "Period in months must be at least 1."),
    cost: z
      .number({
        required_error: "Cost is required.",
        invalid_type_error: "Cost must be a number.",
      })
      .min(0, "Cost must be at least 0."),
  });

  // Validate the request body using Zod
  const validationErrors = await validateRequest(schema, req.body, res);

  const {
    packageName,
    numberOfBranches,
    usersPerBranch,
    periodInMonths,
    cost,
  } = req.body;

  try {
    const newPackage = await prisma.package.create({
      data: {
        packageName,
        numberOfBranches,
        usersPerBranch,
        periodInMonths,
        cost,
      },
    });

    res.status(201).json(newPackage);
  } catch (error) {
    next(error); // Pass the error to the centralized error handler
  }
};

// Get a package by ID
const getPackageById = async (req, res) => {
  const { id } = req.params;

  try {
    const package = await prisma.package.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!package) {
      return res.status(404).json({ errors: { message: "Package not found" } });
    }

    res.status(200).json(package);
  } catch (error) {
    res.status(500).json({
      errors: { message: "Failed to fetch package", details: error.message },
    });
  }
};

// Update a package
const updatePackage = async (req, res, next) => {
  // Define Zod schema for package update
  const schema = z.object({
    packageName: z.string().nonempty("Package name is required."),
    numberOfBranches: z
      .number({
        required_error: "Number of branches is required.",
        invalid_type_error: "Number of branches must be a number.",
      })
      .int("Number of branches must be an integer.")
      .min(1, "Number of branches must be at least 1."),
    usersPerBranch: z
      .number({
        required_error: "Users per branch is required.",
        invalid_type_error: "Users per branch must be a number.",
      })
      .int("Users per branch must be an integer.")
      .min(1, "Users per branch must be at least 1."),
    periodInMonths: z
      .number({
        required_error: "Period in months is required.",
        invalid_type_error: "Period in months must be a number.",
      })
      .int("Period in months must be an integer.")
      .min(1, "Period in months must be at least 1."),
    cost: z
      .number({
        required_error: "Cost is required.",
        invalid_type_error: "Cost must be a number.",
      })
      .min(0, "Cost must be at least 0."),
  });

  // Validate the request body using Zod
  const validationErrors = await validateRequest(schema, req.body, res);
  const { id } = req.params;
  const {
    packageName,
    numberOfBranches,
    usersPerBranch,
    periodInMonths,
    cost,
  } = req.body;

  try {
    const updatedPackage = await prisma.package.update({
      where: { id: parseInt(id, 10) },
      data: {
        packageName,
        numberOfBranches,
        usersPerBranch,
        periodInMonths,
        cost,
      },
    });

    res.status(200).json(updatedPackage);
  } catch (error) {
    if (error.code === "P2025") {
      return next(createError(404, "Package not found"));
    }
    next(error);
  }
};

// Delete a package
const deletePackage = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.package.delete({
      where: { id: parseInt(id, 10) },
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "Package not found" } });
    }
    res.status(500).json({
      errors: { message: "Failed to delete package", details: error.message },
    });
  }
};

module.exports = {
  getPackages,
  createPackage,
  getPackageById,
  updatePackage,
  deletePackage,
};
