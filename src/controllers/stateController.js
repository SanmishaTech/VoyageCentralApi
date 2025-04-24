const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const createError = require("http-errors");
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");

// Get all states with pagination, sorting, and search
const getStates = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

  try {
    // Step 1: Get agencyId of the current user
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.user.id) },
      select: { agencyId: true },
    });

    if (!user?.agencyId) {
      return res.status(404).json({ message: "Agency not found" });
    }

    // Step 2: Build filter clause

    const whereClause = {
      agencyId: user.agencyId,
      OR: [
        { stateName: { contains: search } },
        { country: { countryName: { contains: search } } }, // Filter by countryName
      ],
    };

    // Step 3: Fetch paginated & sorted countries
    // const states = await prisma.state.findMany({
    //   where: whereClause,
    //   select: {
    //     id: true,
    //     stateName: true,
    //     createdAt: true,
    //     updatedAt: true,
    //     country: {
    //       select: {
    //         countryName: true,
    //       },
    //     },
    //   },
    //   skip,
    //   take: limit,
    //   orderBy: { [sortBy]: sortOrder },
    // });
    const states = await prisma.state.findMany({
      where: whereClause,
      select: {
        id: true,
        stateName: true,
        createdAt: true,
        updatedAt: true,
        country: {
          select: {
            countryName: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy:
        sortBy === "countryName"
          ? { country: { countryName: sortOrder } } // Nested orderBy for countryName
          : { [sortBy]: sortOrder }, // Default orderBy for state fields
    });

    // Step 4: Get total count for pagination
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
      if (!req.user.agencyId) {
        return res
          .status(404)
          .json({ message: "User does not belongs to any Agency" });
      }
      const existingState = await prisma.state.findFirst({
        where: {
          AND: [
            { stateName: data.stateName },
            { agencyId: parseInt(req.user.agencyId) },
          ],
        },
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

  try {
    const { stateName, countryId } = req.body;

    const newState = await prisma.state.create({
      data: { stateName, countryId, agencyId: req.user.agencyId },
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
    res.status(500).json({
      errors: { message: "Failed to fetch state", details: error.message },
    });
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
      if (!req.user.agencyId) {
        return res
          .status(404)
          .json({ message: "User does not belongs to any Agency" });
      }

      const existingState = await prisma.state.findFirst({
        where: {
          AND: [
            { stateName: data.stateName },
            { agencyId: parseInt(req.user.agencyId) },
          ],
        },
        select: { id: true }, // We only need the id to compare
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
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "State not found" } });
    }
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
    res.status(500).json({
      errors: { message: "Failed to delete state", details: error.message },
    });
  }
};

// Get all states without pagination, sorting, and search
const getAllStatesByCountryId = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Step 1: Get agencyId of the current user
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: "User does not belongs to any Agency" });
    }

    const states = await prisma.state.findMany({
      where: {
        agencyId: req.user.agencyId,
        countryId: parseInt(id, 10),
      },
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

const getStatesOfIndia = async (req, res, next) => {
  try {
    // Step 1: Check if the country "India" exists
    const india = await prisma.country.findFirst({
      where: {
        countryName: "India",
        agencyId: req.user.agencyId, // Ensure the country belongs to the user's agency
      },
      select: { id: true },
    });

    if (!india) {
      // If "India" does not exist, return an empty array
      return res.status(200).json([]);
    }

    // Step 2: Fetch all states of "India"
    const states = await prisma.state.findMany({
      where: {
        agencyId: req.user.agencyId,
        countryId: india.id,
      },
      select: {
        id: true,
        stateName: true,
      },
    });

    // Step 3: Return the states
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
  getAllStatesByCountryId,
  getStatesOfIndia,
};
