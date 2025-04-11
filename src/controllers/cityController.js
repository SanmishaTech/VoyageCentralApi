const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors"); // For consistent error handling

// Get all cities with pagination, sorting, and search
const getCities = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

  try {
    // Fetch cities with optional pagination, sorting, and search
    const whereClause = {
      cityName: { contains: search },
    };

    const cities = await prisma.city.findMany({
      where: whereClause,
      select: {
        id: true,
        cityName: true,
        state: {
          select: {
            id: true,
            stateName: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    // Fetch total count for pagination
    const totalCities = await prisma.city.count({ where: whereClause });
    const totalPages = Math.ceil(totalCities / limit);

    res.json({
      cities,
      page,
      totalPages,
      totalCities,
    });
  } catch (error) {
    next(error);
  }
};

// Create a new city
const createCity = async (req, res, next) => {
  // Define Zod schema for city creation
  const schema = z
    .object({
      cityName: z
        .string()
        .min(1, "City name cannot be left blank.") // Ensuring minimum length of 2
        .max(100, "City name must not exceed 100 characters.")
        .refine((val) => /^[A-Za-z\s\u0900-\u097F]+$/.test(val), {
          message: "City name can only contain letters.",
        }),
      stateId: z
        .number({
          required_error: "State ID is required.",
          invalid_type_error: "State ID must be a number.",
        })
        .int("State ID must be an integer."),
    })
    .superRefine(async (data, ctx) => {
      // Check if the city already exists
      const existingCity = await prisma.city.findFirst({
        where: { cityName: data.cityName },
      });

      if (existingCity) {
        ctx.addIssue({
          path: ["cityName"],
          message: `City with name ${data.cityName} already exists.`,
        });
      }

      // Check if the state exists
      const existingState = await prisma.state.findUnique({
        where: { id: data.stateId },
      });

      if (!existingState) {
        ctx.addIssue({
          path: ["stateId"],
          message: `State with ID ${data.stateId} does not exist.`,
        });
      }
    });

  // Validate the request body using Zod
  const validationErrors = await validateRequest(schema, req.body, res);

  try {
    const { cityName, stateId } = req.body;

    const agencyId = await prisma.user.findUnique({
      where: { id: parseInt(req.user.id) },
      select: { agencyId: true },
    });

    if (!agencyId.agencyId) {
      return res
        .status(404)
        .json({ errors: { message: "User does not belongs to any Agency" } });
    }

    const newCity = await prisma.city.create({
      data: { cityName, stateId, agencyId: agencyId.agencyId },
    });

    res.status(201).json(newCity);
  } catch (error) {
    next(error);
  }
};

// Get a city by ID
const getCityById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const city = await prisma.city.findFirst({
      where: { id: parseInt(id, 10) },
      select: {
        id: true,
        cityName: true,
        state: {
          select: {
            id: true,
            stateName: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!city) {
      return res.status(404).json({ errors: { message: "City not found" } });
    }

    res.status(200).json(city);
  } catch (error) {
    next(error);
  }
};

// Update a city
const updateCity = async (req, res, next) => {
  // Define Zod schema for city update
  const schema = z
    .object({
      cityName: z
        .string()
        .min(1, "City name cannot be left blank.") // Ensuring minimum length of 2
        .max(100, "City name must not exceed 100 characters.")
        .refine((val) => /^[A-Za-z\s\u0900-\u097F]+$/.test(val), {
          message: "City name can only contain letters.",
        }),
      stateId: z
        .number({
          required_error: "State ID is required.",
          invalid_type_error: "State ID must be a number.",
        })
        .int("State ID must be an integer."),
    })
    .superRefine(async (data, ctx) => {
      const { id } = req.params;

      // Check if the city already exists
      const existingCity = await prisma.city.findFirst({
        where: { cityName: data.cityName },
        select: { id: true },
      });

      if (existingCity && existingCity.id !== parseInt(id)) {
        ctx.addIssue({
          path: ["cityName"],
          message: `City with name ${data.cityName} already exists.`,
        });
      }

      // Check if the state exists
      const existingState = await prisma.state.findUnique({
        where: { id: data.stateId },
      });

      if (!existingState) {
        ctx.addIssue({
          path: ["stateId"],
          message: `State with ID ${data.stateId} does not exist.`,
        });
      }
    });

  // Validate the request body using Zod
  const validationErrors = await validateRequest(schema, req.body, res);

  const { id } = req.params;
  const { cityName, stateId } = req.body;

  try {
    const updatedCity = await prisma.city.update({
      where: { id: parseInt(id, 10) },
      data: { cityName, stateId },
    });

    res.status(200).json(updatedCity);
  } catch (error) {
    next(error);
  }
};

// Delete a city
const deleteCity = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.city.delete({
      where: { id: parseInt(id, 10) },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// Get all cities without pagination, sorting, and search
const getAllCities = async (req, res, next) => {
  try {
    const cities = await prisma.city.findMany({
      select: {
        id: true,
        cityName: true,
        state: {
          select: {
            id: true,
            stateName: true,
          },
        },
      },
    });

    res.status(200).json(cities);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCities,
  createCity,
  getCityById,
  updateCity,
  deleteCity,
  getAllCities,
};
