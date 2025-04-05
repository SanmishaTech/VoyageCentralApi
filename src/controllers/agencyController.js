const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const Joi = require("joi"); // Import Joi for validation
const validateRequest = require("../utils/validation"); // Utility function for validation
const createError = require("http-errors"); // For consistent error handling
const bcrypt = require("bcrypt");

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
    const [agencies, totalAgencies] = await prisma.$transaction([
      prisma.agency.findMany({
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
        },
      }),
      prisma.agency.count({ where: whereClause }), // Get the total count for pagination
    ]);

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
      .optional()
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
    packageId: Joi.number().integer().required().messages({
      "number.base": "Package ID must be a number.",
      "any.required": "Package ID is required.",
    }),
    startDate: Joi.date().required().messages({
      "date.base": "Start date must be a valid date.",
      "any.required": "Start date is required.",
    }),
    endDate: Joi.date().required().messages({
      "date.base": "End date must be a valid date.",
      "any.required": "End date is required.",
    }),
    name: Joi.string().required().messages({
      "string.empty": "User name is required.",
      "any.required": "User name is required.",
    }),
    email: Joi.string().email().required().messages({
      "string.empty": "User email is required.",
      "any.required": "User email is required.",
      "string.email": "User email must be a valid email address.",
    }),
    password: Joi.string().required().messages({
      "string.empty": "User password is required.",
      "any.required": "User password is required.",
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
    packageId,
    startDate,
    endDate,
    name,
    email,
    password,
  } = req.body;

  try {
    // Check if the package exists
    const existingPackage = await prisma.package.findUnique({
      where: { id: packageId },
    });

    if (!existingPackage) {
      return res.status(400).json({
        errors: {
          message: "Package does not exist with the provided packageId.",
        },
      });
    }

    // Check if a user with the same email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        errors: { message: "User already exists with this email." },
      });
    }

    // Use a transaction to create the agency, subscription, and user
    const [newAgency, newSubscription, newUser] = await prisma.$transaction([
      // Create the agency
      prisma.agency.create({
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
      }),
      // Create the subscription and link it to the agency using agencyId
      prisma.subscription.create({
        data: {
          package: {
            connect: { id: packageId }, // Link the subscription to the package using packageId
          },
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          agency: {
            connect: { id: newAgency.id }, // Link the subscription to the agency using agencyId
          },
        },
      }),
      // Create the user and link it to the agency using agencyId
      prisma.user.create({
        data: {
          name,
          email,
          password: await bcrypt.hash(password, 10), // Hash the password
          role: "branch_admin", // Default role
          agency: {
            connect: { id: newAgency.id }, // Link the user to the agency using agencyId
          },
        },
      }),
      // Update the agency with the current subscription ID
      prisma.agency.update({
        where: { id: newAgency.id },
        data: { currentSubscriptionId: newSubscription.id },
      }),
    ]);

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
