const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const dayjs = require('dayjs');
const { z } = require('zod');
const validateRequest = require('../utils/validateRequest');

const prisma = new PrismaClient();

// Get all agencies with pagination, sorting, and search
const getAgencies = async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'id',
    order = 'asc',
    search = '',
  } = req.query;

  const skip = (page - 1) * limit;
  const take = parseInt(limit, 10);

  const orderBy = {};
  orderBy[sortBy] = order.toLowerCase() === 'desc' ? 'desc' : 'asc';

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
      errors: { message: 'Failed to fetch agencies', details: error.message },
    });
  }
};

// Create a new agency
const createAgency = async (req, res, next) => {
  // Define Zod schema for agency validation
  const schema = z
    .object({
      businessName: z.string().nonempty('Business name is required.'),
      addressLine1: z.string().nonempty('Address Line 1 is required.'),
      addressLine2: z.string().optional(),
      state: z.string().nonempty('State is required.'),
      city: z.string().nonempty('City is required.'),
      pincode: z.string().nonempty('Pincode is required.'),
      contactPersonName: z.string().nonempty('Contact person name is required.'),
      contactPersonPhone: z.string().nonempty('Contact person phone is required.'),
      contactPersonEmail: z
        .string()
        .email('Contact person email must be a valid email address.')
        .nonempty('Contact person email is required.'),
      gstin: z
        .string()
        .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1}$/, {
          message: 'GSTIN must be in the format 07ABCDE1234F2Z5.',
        })
        .optional()
        .nullable(),
      letterHead: z.string().optional().nullable(),
      logo: z.string().optional().nullable(),
      subscription: z.object({
        packageId: z.number().int('Package ID must be an integer.'),
        startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
          message: 'Start date must be a valid date.',
        }),
      }),
      user: z.object({
        name: z.string().nonempty('User name is required.'),
        email: z
          .string()
          .email('User email must be a valid email address.')
          .nonempty('User email is required.'),
        password: z.string().nonempty('User password is required.'),
      }),
    })
    .superRefine(async (data, ctx) => {
      // Check if the package exists
      const existingPackage = await prisma.package.findUnique({
        where: { id: data.subscription.packageId },
      });

      if (!existingPackage) {
        ctx.addIssue({
          path: ['subscription', 'packageId'],
          message: `Package with ID ${data.subscription.packageId} does not exist.`,
        });
      }

      // Check if a user with the same email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.user.email },
      });

      if (existingUser) {
        ctx.addIssue({
          path: ['user', 'email'],
          message: `User with email ${data.user.email} already exists.`,
        });
      }
    });

  try {
    // Use the reusable validation function
    const validatedData = await validateRequest(schema, req.body, res);

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
      subscription,
      user,
    } = validatedData;

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

    // Calculate endDate using dayjs
    const startDate = dayjs(subscription.startDate);
    const endDate = startDate.add(existingPackage.periodInMonths, 'month');

    // Create the subscription
    const newSubscription = await prisma.subscription.create({
      data: {
        packageId: subscription.packageId,
        startDate: startDate.toDate(),
        endDate: endDate.toDate(),
        agencyId: newAgency.id,
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
        role: 'branch_admin',
        agencyId: newAgency.id,
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
    next(error); // Pass other errors to the centralized error handler
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
      return res.status(404).json({ errors: { message: 'Agency not found' } });
    }

    res.status(200).json(agency);
  } catch (error) {
    res.status(500).json({
      errors: { message: 'Failed to fetch agency', details: error.message },
    });
  }
};

// Update an agency
const updateAgency = async (req, res, next) => {
  // Define Joi schema for agency validation
  const schema = Joi.object({
    businessName: Joi.string().required().messages({
      'string.empty': 'Business name is required.',
      'any.required': 'Business name is required.',
    }),
    addressLine1: Joi.string().required().messages({
      'string.empty': 'Address Line 1 is required.',
      'any.required': 'Address Line 1 is required.',
    }),
    state1: Joi.string().required().messages({
      'string.empty': 'State 1 is required.',
      'any.required': 'State 1 is required.',
    }),
    city1: Joi.string().required().messages({
      'string.empty': 'City 1 is required.',
      'any.required': 'City 1 is required.',
    }),
    pincode1: Joi.string().required().messages({
      'string.empty': 'Pincode 1 is required.',
      'any.required': 'Pincode 1 is required.',
    }),
    addressLine2: Joi.string().optional(),
    state2: Joi.string().optional(),
    city2: Joi.string().optional(),
    pincode2: Joi.string().optional(),
    contactPersonName: Joi.string().required().messages({
      'string.empty': 'Contact person name is required.',
      'any.required': 'Contact person name is required.',
    }),
    contactPersonEmail: Joi.string().email().required().messages({
      'string.empty': 'Contact person email is required.',
      'any.required': 'Contact person email is required.',
      'string.email': 'Contact person email must be a valid email address.',
    }),
    contactPersonPhone: Joi.string().required().messages({
      'string.empty': 'Contact person phone is required.',
      'any.required': 'Contact person phone is required.',
    }),
    gstin: Joi.string()
      .optional()
      .pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1}$/)
      .messages({
        'string.pattern.base': 'GSTIN must be in the format 07ABCDE1234F2Z5.',
      }),
    letterHead: Joi.string().optional().messages({
      'string.empty': 'Letterhead must be a valid file path or URL.',
    }),
    currentSubscriptionId: Joi.number().optional(),
    logo: Joi.string().optional().messages({
      'string.empty': 'Logo must be a valid file path or URL.',
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
    if (error.code === 'P2025') {
      return next(createError(404, 'Agency not found'));
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
    if (error.code === 'P2025') {
      return res.status(404).json({ errors: { message: 'Agency not found' } });
    }
    res.status(500).json({
      errors: { message: 'Failed to delete agency', details: error.message },
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
