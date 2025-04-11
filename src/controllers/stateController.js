const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors"); // For consistent error handling

// Get all states with pagination, sorting, and search
const getStates = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

  try {
    // Fetch states with optional pagination, sorting, and search
    const whereClause = {
      stateName: { contains: search },
    };

    const states = await prisma.state.findMany({
      where: whereClause,
      select: {
        id: true,
        stateName: true,
        country: {
          select: {
            id: true,
            countryName: true,
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
    const totalStates = await prisma.state.count({ where: whereClause });
    const totalPages = Math.ceil(totalStates / limit);

    res.json({
      states,
      page,
      totalPages,
      totalStates,
    });
  } catch (error) {
    next(error);
  }
};

// Create a new state
const createState = async (req, res, next) => {
  // Define Zod schema for state creation
  const schema = z
    .object({
      stateName: z
        .string()
        .min(1, "State name cannot be left blank.") // Ensuring minimum length of 2
        .max(100, "State name must not exceed 100 characters.")
        .refine((val) => /^[A-Za-z\s\u0900-\u097F]+$/.test(val), {
          message: "State name can only contain letters.",
        }),
      countryId: z
        .number({
          required_error: "Country ID is required.",
          invalid_type_error: "Country ID must be a number.",
        })
        .int("Country ID must be an integer."),
    })
    .superRefine(async (data, ctx) => {
      // Check if the state already exists
      const existingState = await prisma.state.findFirst({
        where: { stateName: data.stateName },
      });

      if (existingState) {
        ctx.addIssue({
          path: ["stateName"],
          message: `State with name ${data.stateName} already exists.`,
        });
      }

      // Check if the country exists
      const existingCountry = await prisma.country.findUnique({
        where: { id: data.countryId },
      });

      if (!existingCountry) {
        ctx.addIssue({
          path: ["countryId"],
          message: `Country with ID ${data.countryId} does not exist.`,
        });
      }
    });

  // Validate the request body using Zod
  const validationErrors = await validateRequest(schema, req.body, res);

  const { stateName, countryId } = req.body;

  try {
    const newState = await prisma.state.create({
      data: { stateName, countryId },
    });

    res.status(201).json(newState);
  } catch (error) {
    next(error);
  }
};

// Get a state by ID
const getStateById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const state = await prisma.state.findFirst({
      where: { id: parseInt(id, 10) },
      select: {
        id: true,
        stateName: true,
        country: {
          select: {
            id: true,
            countryName: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!state) {
      return res.status(404).json({ errors: { message: "State not found" } });
    }

    res.status(200).json(state);
  } catch (error) {
    next(error);
  }
};

// Update a state
const updateState = async (req, res, next) => {
  // Define Zod schema for state update
  const schema = z
    .object({
      stateName: z
        .string()
        .min(1, "State name cannot be left blank.") // Ensuring minimum length of 2
        .max(100, "State name must not exceed 100 characters.")
        .refine((val) => /^[A-Za-z\s\u0900-\u097F]+$/.test(val), {
          message: "State name can only contain letters.",
        }),
      countryId: z
        .number({
          required_error: "Country ID is required.",
          invalid_type_error: "Country ID must be a number.",
        })
        .int("Country ID must be an integer."),
    })
    .superRefine(async (data, ctx) => {
      const { id } = req.params;

      // Check if the state already exists
      const existingState = await prisma.state.findFirst({
        where: { stateName: data.stateName },
        select: { id: true },
      });

      if (existingState && existingState.id !== parseInt(id)) {
        ctx.addIssue({
          path: ["stateName"],
          message: `State with name ${data.stateName} already exists.`,
        });
      }

      // Check if the country exists
      const existingCountry = await prisma.country.findUnique({
        where: { id: data.countryId },
      });

      if (!existingCountry) {
        ctx.addIssue({
          path: ["countryId"],
          message: `Country with ID ${data.countryId} does not exist.`,
        });
      }
    });

  // Validate the request body using Zod
  const validationErrors = await validateRequest(schema, req.body, res);

  const { id } = req.params;
  const { stateName, countryId } = req.body;

  try {
    const updatedState = await prisma.state.update({
      where: { id: parseInt(id, 10) },
      data: { stateName, countryId },
    });

    res.status(200).json(updatedState);
  } catch (error) {
    next(error);
  }
};

// Delete a state
const deleteState = async (req, res, next) => {
  const { id } = req.params;

  try {
    await prisma.state.delete({
      where: { id: parseInt(id, 10) },
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "State not found" } });
    }
    next(error);
  }
};

// Get all states without pagination, sorting, and search
const getAllStates = async (req, res, next) => {
  try {
    const states = await prisma.state.findMany({
      select: {
        id: true,
        stateName: true,
        country: {
          select: {
            id: true,
            countryName: true,
          },
        },
      },
    });

    res.status(200).json(states);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStates,
  createState,
  getStateById,
  updateState,
  deleteState,
  getAllStates,
};
