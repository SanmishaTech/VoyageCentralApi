const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors"); // For consistent error handling

// Get all packages with pagination, sorting, and search
const getPackages = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";
  const exportToExcel = req.query.export === "true"; // Check if export is requested

  try {
    // Fetch packages with optional pagination, sorting, and search
    const whereClause = {
      OR: [
        { packageName: { contains: search } },
        {
          usersPerBranch: isNaN(parseInt(search))
            ? undefined
            : { equals: parseInt(search) },
        },
        {
          numberOfBranches: isNaN(parseInt(search))
            ? undefined
            : { equals: parseInt(search) },
        },
        {
          periodInMonths: isNaN(parseInt(search))
            ? undefined
            : { equals: parseInt(search) },
        },
        {
          cost: isNaN(parseInt(search))
            ? undefined
            : { equals: parseInt(search) },
        },
      ],
    };

    const packages = await prisma.package.findMany({
      where: whereClause,
      select: {
        id: true,
        packageName: true,
        numberOfBranches: true,
        usersPerBranch: true,
        periodInMonths: true,
        cost: true,
        createdAt: true,
        updatedAt: true,
      },
      skip: exportToExcel ? undefined : skip, // Skip pagination if exporting to Excel
      take: exportToExcel ? undefined : limit, // Skip limit if exporting to Excel
      orderBy: exportToExcel ? undefined : { [sortBy]: sortOrder }, // Skip sorting if exporting to Excel
    });

    if (exportToExcel) {
      // Export packages to Excel
      const ExcelJS = require("exceljs");
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Packages");

      // Add headers
      worksheet.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "Package Name", key: "packageName", width: 30 },
        { header: "Number of Branches", key: "numberOfBranches", width: 20 },
        { header: "Users Per Branch", key: "usersPerBranch", width: 20 },
        { header: "Period (Months)", key: "periodInMonths", width: 20 },
        { header: "Cost", key: "cost", width: 15 },
        { header: "Created At", key: "createdAt", width: 25 },
        { header: "Updated At", key: "updatedAt", width: 25 },
      ];

      // Add rows
      packages.forEach((pkg) => {
        worksheet.addRow({
          id: pkg.id,
          packageName: pkg.packageName,
          numberOfBranches: pkg.numberOfBranches,
          usersPerBranch: pkg.usersPerBranch,
          periodInMonths: pkg.periodInMonths,
          cost: pkg.cost,
          createdAt: pkg.createdAt.toISOString(),
          updatedAt: pkg.updatedAt.toISOString(),
        });
      });

      // Set response headers for file download
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=packages.xlsx"
      );

      // Write the workbook to the response
      await workbook.xlsx.write(res);
      return res.end();
    }

    // Fetch total count for pagination
    const totalPackages = await prisma.package.count({ where: whereClause });
    const totalPages = Math.ceil(totalPackages / limit);

    res.json({
      packages,
      page,
      totalPages,
      totalPackages,
    });
  } catch (error) {
    next(error);
  }
};

// Create a new package
const createPackage = async (req, res, next) => {
  // Define Zod schema for package creation
  const schema = z
    .object({
      packageName: z
        .string()
        .min(1, "Package name cannot be left blank.") // Ensuring minimum length of 2
        .max(100, "Package name must not exceed 100 characters.")
        .refine((val) => /^[A-Za-z\s\u0900-\u097F]+$/.test(val), {
          message: "Package name can only contain letters.",
        }),
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
    })
    .superRefine(async (data, ctx) => {
      // Check if the package exists
      const existingPackageName = await prisma.package.findFirst({
        where: { packageName: data.packageName },
      });

      if (existingPackageName) {
        ctx.addIssue({
          path: ["packageName"],
          message: `Package with Name ${data.packageName} already exist.`,
        });
      }
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
const getPackageById = async (req, res, next) => {
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
  const schema = z
    .object({
      packageName: z
        .string()
        .min(1, "Package name cannot be left blank.") // Ensuring minimum length of 2
        .max(100, "Package name must not exceed 100 characters.")
        .refine((val) => /^[A-Za-z\s\u0900-\u097F]+$/.test(val), {
          message: "Package name can only contain letters.",
        }),
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
    })
    .superRefine(async (data, ctx) => {
      const { id } = req.params; // Get the current user's ID from the URL params

      // Check if a user with the same email already exists, excluding the current user
      const existingPackageName = await prisma.package.findFirst({
        where: {
          packageName: data.packageName,
        },
        select: { id: true }, // We only need the id to compare
      });

      // If an existing user is found and it's not the current user
      if (existingPackageName && existingPackageName.id !== parseInt(id)) {
        ctx.addIssue({
          path: ["packageName"],
          message: `package with Name ${data.packageName} already exists.`,
        });
      }
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
const deletePackage = async (req, res, next) => {
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
    return res.status(500).json({
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
