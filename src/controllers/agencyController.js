const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const Joi = require("joi"); // Import Joi for validation
const validateRequest = require("../utils/validation"); // Utility function for validation
const createError = require("http-errors"); // For consistent error handling

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
    const agencies = await prisma.agency.findMany({
      where: whereClause,
      skip,
      take,
      orderBy,
    });

    const totalAgencies = await prisma.agency.count({ where: whereClause });

    res.status(200).json({
      agencies: agencies,
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
    gstin: Joi.string().required().messages({
      "string.empty": "GSTIN is required.",
      "any.required": "GSTIN is required.",
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

  try {
    const newAgency = await prisma.agency.create({
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

    res.status(201).json(newAgency);
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
    gstin: Joi.string().required().messages({
      "string.empty": "GSTIN is required.",
      "any.required": "GSTIN is required.",
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
