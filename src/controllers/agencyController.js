const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const Joi = require("joi"); // Import Joi for validation
const validateRequest = require("../utils/validation"); // Utility function for validation
const createError = require("http-errors"); // For consistent error handling
const bcrypt = require("bcrypt");
const dayjs = require("dayjs"); // Import dayjs

// Get all agencies with pagination, sorting, and search
const getAgencies = async (req, res) => {
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
    OR: [
      { businessName: { contains: search } },
      { contactPersonName: { contains: search } },
    ],
  };

  try {
    // Fetch agencies with pagination, sorting, and related data
    const agencies = await prisma.agency.findMany({
      skip,
      take,
      orderBy,
      where: whereClause,
      include: {
        currentSubscription: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            createdAt: true,
            updatedAt: true,
            package: true, // Include the package details from the packageId
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            branchId: true,
            role: true,
            active: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    // Get the total count for pagination
    const totalAgencies = await prisma.agency.count({ where: whereClause });

    res.status(200).json({
      data: agencies,
      meta: {
        total: totalAgencies,
        page: parseInt(page, 10),
        limit: take,
        totalPages: Math.ceil(totalAgencies / take),
      },
    });
  } catch (error) {
    res.status(500).json({
      errors: { message: "Failed to fetch agencies", details: error.message },
    });
  }
};

// Create a new agency
const createAgency = async (req, res, next) => {
  // Define Joi schema for agency validation
  const schema = Joi.object({
    businessName: Joi.string().required().messages({
      "string.empty": "Business name is required.",
      "any.required": "Business name is required.",
    }),
    addressLine1: Joi.string().required().messages({
      "string.empty": "Address Line 1 is required.",
      "any.required": "Address Line 1 is required.",
    }),
    addressLine2: Joi.string().optional(),
    state: Joi.string().required().messages({
      "string.empty": "State is required.",
      "any.required": "State is required.",
    }),
    city: Joi.string().required().messages({
      "string.empty": "City is required.",
      "any.required": "City is required.",
    }),
    pincode: Joi.string().required().messages({
      "string.empty": "Pincode is required.",
      "any.required": "Pincode is required.",
    }),
    contactPersonName: Joi.string().required().messages({
      "string.empty": "Contact person name is required.",
      "any.required": "Contact person name is required.",
    }),
    contactPersonPhone: Joi.string().required().messages({
      "string.empty": "Contact person phone is required.",
      "any.required": "Contact person phone is required.",
    }),
    contactPersonEmail: Joi.string().email().required().messages({
      "string.empty": "Contact person email is required.",
      "any.required": "Contact person email is required.",
      "string.email": "Contact person email must be a valid email address.",
    }),
    gstin: Joi.string()
      .allow("", null) // Allow empty string or null
      .pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1}$/)
      .messages({
        "string.pattern.base": "GSTIN must be in the format 07ABCDE1234F2Z5.",
      }),
    letterHead: Joi.string().optional().messages({
      "string.empty": "Letterhead must be a valid file path or URL.",
    }),
    logo: Joi.string().optional().messages({
      "string.empty": "Logo must be a valid file path or URL.",
    }),
    subscription: Joi.object({
      packageId: Joi.number()
        .integer()
        .required()
        .external(async (value) => {
          // Check if the package exists
          const existingPackage = await prisma.package.findUnique({
            where: { id: value },
          });

          if (!existingPackage) {
            throw new Error(
              "Package does not exist with the provided packageId."
            );
          }
          return value;
        })
        .messages({
          "number.base": "Package ID must be a number.",
          "any.required": "Package ID is required.",
        }),
      startDate: Joi.date().required().messages({
        "date.base": "Start date must be a valid date.",
        "any.required": "Start date is required.",
      }),
    }).required(),
    user: Joi.object({
      name: Joi.string().required().messages({
        "string.empty": "User name is required.",
        "any.required": "User name is required.",
      }),
      email: Joi.string()
        .email()
        .required()
        .external(async (value) => {
          // Check if a user with the same email already exists
          const existingUser = await prisma.user.findUnique({
            where: { email: value },
          });

          if (existingUser) {
            throw new Error("User already exists with this email.");
          }
          return value;
        })
        .messages({
          "string.empty": "User email is required.",
          "any.required": "User email is required.",
          "string.email": "User email must be a valid email address.",
        }),
      password: Joi.string().required().messages({
        "string.empty": "User password is required.",
        "any.required": "User password is required.",
      }),
    }).required(),
  });

  try {
    // Use validateRequest utility function
    const validationErrors = await validateRequest(schema, req);
    if (validationErrors) {
      return res.status(400).json({ errors: validationErrors });
    }

    const {
      businessName,
      addressLine1,
      addressLine2,
      state,
      city,
      pincode,
      contactPersonName,
      contactPersonPhone,
      contactPersonEmail,
      gstin,
      letterHead,
      logo,
      subscription, // Extract subscription object
      user, // Extract user object
    } = req.body;

    // Create the agency first to get its ID
    const newAgency = await prisma.agency.create({
      data: {
        businessName,
        addressLine1,
        addressLine2,
        state,
        city,
        pincode,
        contactPersonName,
        contactPersonPhone,
        contactPersonEmail,
        gstin,
        letterHead,
        logo,
      },
    });

    // Get package data to calculate endDate
    const packageData = await prisma.package.findUnique({
      where: { id: subscription.packageId },
    });

    if (!packageData) {
      return res.status(400).json({
        errors: {
          message: "Package does not exist with the provided packageId.",
        },
      });
    }

    // Calculate endDate using dayjs
    const startDate = dayjs(subscription.startDate);
    const endDate = startDate.add(packageData.periodInMonths, "month");

    // Create the subscription
    const newSubscription = await prisma.subscription.create({
      data: {
        packageId: subscription.packageId,
        startDate: startDate.toDate(), // Convert dayjs object to JavaScript Date
        endDate: endDate.toDate(), // Convert dayjs object to JavaScript Date
        agencyId: newAgency.id, // Link to the newly created agency
      },
    });

    // Hash the user password
    const hashedPassword = await bcrypt.hash(user.password, 10);

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        password: hashedPassword,
        role: "branch_admin", // Default role
        agencyId: newAgency.id, // Link to the newly created agency
      },
    });

    // Update the agency with the latest subscription ID
    await prisma.agency.update({
      where: { id: newAgency.id },
      data: { currentSubscriptionId: newSubscription.id },
    });

    res.status(201).json({
      agency: newAgency,
      subscription: newSubscription,
      user: newUser,
    });
  } catch (error) {
    next(error); // Pass the error to the centralized error handler
  }
};

// Get an agency by ID
const getAgencyById = async (req, res) => {
  const { id } = req.params;

  try {
    const agency = await prisma.agency.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            branchId: true,
            role: true,
            active: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        subscriptions: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            createdAt: true,
            updatedAt: true,
            package: {
              select: {
                id: true,
                packageName: true,
                numberOfBranches: true,
                usersPerBranch: true,
                periodInMonths: true,
                cost: true,
              },
            },
          },
        },
      },
    });

    if (!agency) {
      return res.status(404).json({ errors: { message: "Agency not found" } });
    }

    res.status(200).json(agency);
  } catch (error) {
    res.status(500).json({
      errors: { message: "Failed to fetch agency", details: error.message },
    });
  }
};

// Update an agency
const updateAgency = async (req, res, next) => {
  // Define Joi schema for agency validation
  const schema = Joi.object({
    businessName: Joi.string().required().messages({
      "string.empty": "Business name is required.",
      "any.required": "Business name is required.",
    }),
    addressLine1: Joi.string().required().messages({
      "string.empty": "Address Line 1 is required.",
      "any.required": "Address Line 1 is required.",
    }),
    state1: Joi.string().required().messages({
      "string.empty": "State 1 is required.",
      "any.required": "State 1 is required.",
    }),
    city1: Joi.string().required().messages({
      "string.empty": "City 1 is required.",
      "any.required": "City 1 is required.",
    }),
    pincode1: Joi.string().required().messages({
      "string.empty": "Pincode 1 is required.",
      "any.required": "Pincode 1 is required.",
    }),
    addressLine2: Joi.string().optional(),
    state2: Joi.string().optional(),
    city2: Joi.string().optional(),
    pincode2: Joi.string().optional(),
    contactPersonName: Joi.string().required().messages({
      "string.empty": "Contact person name is required.",
      "any.required": "Contact person name is required.",
    }),
    contactPersonEmail: Joi.string().email().required().messages({
      "string.empty": "Contact person email is required.",
      "any.required": "Contact person email is required.",
      "string.email": "Contact person email must be a valid email address.",
    }),
    contactPersonPhone: Joi.string().required().messages({
      "string.empty": "Contact person phone is required.",
      "any.required": "Contact person phone is required.",
    }),
    gstin: Joi.string()
      .optional()
      .pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1}$/)
      .messages({
        "string.pattern.base": "GSTIN must be in the format 07ABCDE1234F2Z5.",
      }),
    letterHead: Joi.string().optional().messages({
      "string.empty": "Letterhead must be a valid file path or URL.",
    }),
    currentSubscriptionId: Joi.number().optional(),
    logo: Joi.string().optional().messages({
      "string.empty": "Logo must be a valid file path or URL.",
    }),
  });

  // Validate request body using the utility function
  const validationErrors = validateRequest(schema, req);
  if (validationErrors) {
    return res.status(400).json({ errors: validationErrors });
  }

  const {
    businessName,
    addressLine1,
    state1,
    city1,
    pincode1,
    addressLine2,
    state2,
    city2,
    pincode2,
    contactPersonName,
    contactPersonEmail,
    contactPersonPhone,
    gstin,
    letterHead,
    currentSubscriptionId,
    logo,
  } = req.body;

  const { id } = req.params;

  try {
    const updatedAgency = await prisma.agency.update({
      where: { id: parseInt(id, 10) },
      data: {
        businessName,
        addressLine1,
        state1,
        city1,
        pincode1,
        addressLine2,
        state2,
        city2,
        pincode2,
        contactPersonName,
        contactPersonEmail,
        contactPersonPhone,
        gstin,
        letterHead,
        currentSubscriptionId,
        logo,
      },
    });

    res.status(200).json(updatedAgency);
  } catch (error) {
    if (error.code === "P2025") {
      return next(createError(404, "Agency not found"));
    }
    next(error);
  }
};

// Delete an agency
const deleteAgency = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.agency.delete({
      where: { id: parseInt(id, 10) },
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "Agency not found" } });
    }
    res.status(500).json({
      errors: { message: "Failed to delete agency", details: error.message },
    });
  }
};

module.exports = {
  getAgencies,
  createAgency,
  getAgencyById,
  updateAgency,
  deleteAgency,
};
