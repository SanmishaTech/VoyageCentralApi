const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const dayjs = require("dayjs");
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");

const prisma = new PrismaClient();

// Get all agencies with pagination, sorting, and search
const getAgencies = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";
  const exportToExcel = req.query.export === "true"; // Check if export is requested

  try {
    // Build the where clause for filtering
    const whereClause = {
      OR: [
        { businessName: { contains: search } },
        { contactPersonName: { contains: search } },
        { addressLine1: { contains: search } },
        { addressLine2: { contains: search } },
        { state: { contains: search } },
        { city: { contains: search } },
        { contactPersonEmail: { contains: search } },
        { contactPersonPhone: { contains: search } },
      ],
    };

    // Fetch agencies with optional pagination, sorting, and search
    const agencies = await prisma.agency.findMany({
      where: whereClause,
      select: {
        id: true,
        businessName: true,
        addressLine1: true,
        addressLine2: true,
        state: true,
        city: true,
        pincode: true,
        contactPersonName: true,
        contactPersonEmail: true,
        contactPersonPhone: true,
        gstin: true,
        letterHead: true,
        logo: true,
        currentSubscription: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
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
      skip: exportToExcel ? undefined : skip, // Skip pagination if exporting to Excel
      take: exportToExcel ? undefined : limit, // Skip limit if exporting to Excel
      orderBy: exportToExcel ? undefined : { [sortBy]: sortOrder }, // Skip sorting if exporting to Excel
    });

    if (exportToExcel) {
      // Export agencies to Excel
      const ExcelJS = require("exceljs");
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Agencies");

      // Add headers
      worksheet.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "Business Name", key: "businessName", width: 30 },
        { header: "Address Line 1", key: "addressLine1", width: 30 },
        { header: "Address Line 2", key: "addressLine2", width: 30 },
        { header: "State", key: "state", width: 15 },
        { header: "City", key: "city", width: 15 },
        { header: "Pincode", key: "pincode", width: 10 },
        { header: "Contact Person Name", key: "contactPersonName", width: 25 },
        {
          header: "Contact Person Email",
          key: "contactPersonEmail",
          width: 30,
        },
        {
          header: "Contact Person Phone",
          key: "contactPersonPhone",
          width: 20,
        },
        { header: "GSTIN", key: "gstin", width: 20 },
        { header: "Letter Head", key: "letterHead", width: 20 },
        { header: "Logo", key: "logo", width: 20 },
        { header: "Subscription Start Date", key: "startDate", width: 20 },
        { header: "Subscription End Date", key: "endDate", width: 20 },
        { header: "Package Name", key: "packageName", width: 30 },
        { header: "Package Cost", key: "cost", width: 15 },
      ];

      // Add rows
      agencies.forEach((agency) => {
        worksheet.addRow({
          id: agency.id,
          businessName: agency.businessName,
          addressLine1: agency.addressLine1,
          addressLine2: agency.addressLine2,
          state: agency.state,
          city: agency.city,
          pincode: agency.pincode,
          contactPersonName: agency.contactPersonName,
          contactPersonEmail: agency.contactPersonEmail,
          contactPersonPhone: agency.contactPersonPhone,
          gstin: agency.gstin,
          letterHead: agency.letterHead,
          logo: agency.logo,
          startDate: agency.currentSubscription?.startDate
            ? agency.currentSubscription.startDate.toISOString()
            : "N/A",
          endDate: agency.currentSubscription?.endDate
            ? agency.currentSubscription.endDate.toISOString()
            : "N/A",
          packageName:
            agency.currentSubscription?.package?.packageName || "N/A",
          cost: agency.currentSubscription?.package?.cost || "N/A",
        });
      });

      // Set response headers for file download
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=agencies.xlsx"
      );

      // Write the workbook to the response
      await workbook.xlsx.write(res);
      return res.end();
    }

    // Fetch total count for pagination
    const totalAgencies = await prisma.agency.count({ where: whereClause });
    const totalPages = Math.ceil(totalAgencies / limit);

    res.json({
      data: agencies,
      page,
      totalPages,
      totalAgencies,
    });
  } catch (error) {
    next(error);
  }
};

// Create a new agency
const createAgency = async (req, res, next) => {
  // Define Zod schema for agency validation
  const schema = z
    .object({
      businessName: z.string().nonempty("Business name is required."),
      addressLine1: z.string().nonempty("Address Line 1 is required."),
      addressLine2: z.string().optional(),
      state: z.string().nonempty("State is required."),
      city: z.string().nonempty("City is required."),
      pincode: z.string().nonempty("Pincode is required."),
      contactPersonName: z
        .string()
        .nonempty("Contact person name is required."),
      contactPersonPhone: z
        .string()
        .nonempty("Contact person phone is required."),
      contactPersonEmail: z
        .string()
        .email("Contact person email must be a valid email address.")
        .nonempty("Contact person email is required."),
      gstin: z
        .string()
        .regex(
          /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1}$/,
          {
            message: "GSTIN must be in the format 07ABCDE1234F2Z5.",
          }
        )
        .or(z.literal("")) // Allow empty string
        .or(z.null()) // Allow null
        .optional(), // Allow undefined (not strictly necessary here, but can be used)
      letterHead: z.string().optional().nullable(),
      logo: z.string().optional().nullable(),
      subscription: z.object({
        packageId: z.number().int("Package ID must be an integer."),
        startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
          message: "Start date must be a valid date.",
        }),
      }),
      user: z.object({
        name: z.string().nonempty("User name is required."),
        email: z
          .string()
          .email("User email must be a valid email address.")
          .nonempty("User email is required."),
        password: z.string().nonempty("User password is required."),
      }),
    })
    .superRefine(async (data, ctx) => {
      // Check if the package exists
      const existingPackage = await prisma.package.findUnique({
        where: { id: data.subscription.packageId },
      });

      if (!existingPackage) {
        ctx.addIssue({
          path: ["subscription", "packageId"],
          message: `Package with ID ${data.subscription.packageId} does not exist.`,
        });
      }

      // Check if a user with the same email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.user.email },
      });

      if (existingUser) {
        ctx.addIssue({
          path: ["user", "email"],
          message: `User with email ${data.user.email} already exists.`,
        });
      }
    });

  try {
    // Use the reusable validation function
    const validationErrors = await validateRequest(schema, req.body, res);
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

    const existingPackage = await prisma.package.findUnique({
      where: { id: subscription.packageId },
    });

    // Calculate endDate using dayjs
    const startDate = dayjs(subscription.startDate);
    const endDate = startDate.add(existingPackage.periodInMonths, "month");

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
        role: "branch_admin",
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
  // Define Zod schema for agency validation
  const schema = z.object({
    businessName: z.string().nonempty("Business name is required."),
    addressLine1: z.string().nonempty("Address Line 1 is required."),
    addressLine2: z.string().optional(),
    state: z.string().nonempty("State is required."),
    city: z.string().nonempty("City is required."),
    pincode: z.string().nonempty("Pincode is required."),
    contactPersonName: z.string().nonempty("Contact person name is required."),
    contactPersonEmail: z
      .string()
      .email("Contact person email must be a valid email address.")
      .nonempty("Contact person email is required."),
    contactPersonPhone: z
      .string()
      .nonempty("Contact person phone is required."),
    gstin: z
      .string()
      .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1}$/, {
        message: "GSTIN must be in the format 07ABCDE1234F2Z5.",
      })
      .or(z.literal("")) // Allow empty string
      .or(z.null()) // Allow null
      .optional(), // Allow undefined (not strictly necessary here, but can be used)
    letterHead: z.string().optional().nullable(),
    logo: z.string().optional().nullable(),
  });

  try {
    // Use the reusable validation function
    const validationErrors = await validateRequest(schema, req.body, res);
    const {
      businessName,
      addressLine1,
      addressLine2,
      state,
      city,
      pincode,
      contactPersonName,
      contactPersonEmail,
      contactPersonPhone,
      gstin,
      letterHead,
      logo,
    } = req.body;

    const { id } = req.params;

    // Update the agency
    const updatedAgency = await prisma.agency.update({
      where: { id: parseInt(id, 10) },
      data: {
        businessName,
        addressLine1,
        addressLine2,
        state,
        city,
        pincode,
        contactPersonName,
        contactPersonEmail,
        contactPersonPhone,
        gstin,
        letterHead,
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
