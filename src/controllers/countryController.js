const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors"); // For consistent error handling

// Get all countries with pagination, sorting, and search
const getCountries = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

  try {
    let whereClause = {
      countryName: { contains: search },
    };

    if (req.user.agencyId) {
      whereClause.agencyId = req.user.agencyId;
    } else if (req.user.role === "super_admin") {
      whereClause.agencyId = null;
    }
    // Step 2: Build filter clause

    // Step 3: Fetch paginated & sorted countries
    const countries = await prisma.country.findMany({
      where: whereClause,
      select: {
        id: true,
        countryName: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    // Step 4: Get total count for pagination
    const totalCountries = await prisma.country.count({ where: whereClause });
    const totalPages = Math.ceil(totalCountries / limit);

    res.json({
      countries,
      page,
      totalPages,
      totalCountries,
    });
  } catch (error) {
    next(error);
  }
};

// Create a new country
const createCountry = async (req, res, next) => {
  // Define Zod schema for country creation
  const schema = z
    .object({
      countryName: z
        .string()
        .min(1, "Country name cannot be left blank.") // Ensuring minimum length of 2
        .max(100, "Country name must not exceed 100 characters.")
        .refine((val) => /^[A-Za-z\s\u0900-\u097F]+$/.test(val), {
          message: "Country name can only contain letters.",
        }),
    })
    .superRefine(async (data, ctx) => {
      // if (!req.user.agencyId) {
      //   return res
      //     .status(404)
      //     .json({ message: "User does not belongs to any Agency" });
      // }
      const existingCountry = await prisma.country.findFirst({
        where: {
          AND: [
            { countryName: data.countryName },
            { agencyId: parseInt(req.user.agencyId) || null },
          ],
        },
      });

      if (existingCountry) {
        ctx.addIssue({
          path: ["countryName"],
          message: `Country with Name ${data.countryName} already exist.`,
        });
      }
    });

  const validationErrors = await validateRequest(schema, req.body, res);

  try {
    const { countryName } = req.body;

    const newCountry = await prisma.country.create({
      data: { countryName, agencyId: req.user.agencyId || null },
    });

    res.status(201).json(newCountry);
  } catch (error) {
    next(error);
  }
};

// Get a country by ID
const getCountryById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const country = await prisma.country.findFirst({
      where: { id: parseInt(id, 10) },
    });

    if (!country) {
      return res.status(404).json({ errors: { message: "Country not found" } });
    }

    res.status(200).json(country);
  } catch (error) {
    res.status(500).json({
      errors: { message: "Failed to fetch country", details: error.message },
    });
  }
};

// Update a country
const updateCountry = async (req, res, next) => {
  // Define Zod schema for country update
  const schema = z
    .object({
      countryName: z
        .string()
        .min(1, "Country name cannot be left blank.") // Ensuring minimum length of 2
        .max(100, "Country name must not exceed 100 characters.")
        .refine((val) => /^[A-Za-z\s\u0900-\u097F]+$/.test(val), {
          message: "Country name can only contain letters.",
        }),
    })
    .superRefine(async (data, ctx) => {
      // if (!req.user.agencyId) {
      //   return res
      //     .status(404)
      //     .json({ message: "User does not belongs to any Agency" });
      // }
      const { id } = req.params; // Get the current user's ID from the URL params

      // Check if a user with the same email already exists, excluding the current user
      const existingCountry = await prisma.country.findFirst({
        where: {
          AND: [
            { countryName: data.countryName },
            { agencyId: parseInt(req.user.agencyId) || null },
          ],
        },
        select: { id: true }, // We only need the id to compare
      });

      // If an existing user is found and it's not the current user
      if (existingCountry && existingCountry.id !== parseInt(id)) {
        ctx.addIssue({
          path: ["countryName"],
          message: `Country with Name ${data.countryName} already exists.`,
        });
      }
    });

  // Validate the request body using Zod
  const validationErrors = await validateRequest(schema, req.body, res);

  const { id } = req.params;
  const { countryName } = req.body;

  try {
    const updatedCountry = await prisma.country.update({
      where: { id: parseInt(id, 10) },
      data: { countryName },
    });

    res.status(200).json(updatedCountry);
  } catch (error) {
    if (error.code === "P2025") {
      return next(createError(404, "Country not found"));
    }
    next(error);
  }
};

// Delete a country
const deleteCountry = async (req, res, next) => {
  const { id } = req.params;

  try {
    await prisma.country.delete({
      where: { id: parseInt(id, 10) },
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "Country not found" } });
    }
    res.status(500).json({
      errors: { message: "Failed to delete country", details: error.message },
    });
  }
};

// Get all countries without pagination, sorting, and search
const getAllCountries = async (req, res, next) => {
  try {
    // Step 1: Get agencyId of the current user
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: "User does not belongs to any Agency" });
    }

    const countries = await prisma.country.findMany({
      where: {
        agencyId: req.user.agencyId || null,
      },
      select: {
        id: true,
        countryName: true,
      },
    });

    res.status(200).json(countries);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCountries,
  createCountry,
  getCountryById,
  updateCountry,
  deleteCountry,
  getAllCountries,
};
