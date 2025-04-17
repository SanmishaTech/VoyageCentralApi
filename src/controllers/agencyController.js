const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const dayjs = require("dayjs");
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest"); // Assuming this merges Zod body errors and req.uploadErrors
const createError = require("http-errors");
const prisma = new PrismaClient();
const fs = require("fs").promises; // Use promises API
const path = require("path");
const ExcelJS = require("exceljs");

// --- Configuration ---
const UPLOAD_DIR_BASE = "uploads"; // Base directory - MUST MATCH STATIC SERVING and middleware config
const AGENCY_MODULE_NAME = "agency"; // Define module name consistently

// --- Helper to construct URLs (Updated for new structure) ---
const getFileUrl = (moduleName, fieldName, uuid, filename) => {
  // Check if all required parts are present
  if (!moduleName || !fieldName || !uuid || !filename) return null;

  // IMPORTANT: This path MUST correspond to how you serve static files in Express
  // Example: app.use('/uploads', express.static('uploads')); needs to serve the whole 'uploads' dir

  // Construct the URL: /<base>/<module>/<field>/<uuid>/<filename>
  return `/${UPLOAD_DIR_BASE}/${moduleName}/${fieldName}/${uuid}/${filename}`;
};

// --- Zod Schemas (Remain the same - validate body data) ---
const createAgencyBodySchema = z
  .object({
    // --- Agency Details ---
    businessName: z
      .string({ required_error: "Business name is required." })
      .min(1, "Business name cannot be empty.")
      .max(100, "Business name must not exceed 100 characters."),
    addressLine1: z
      .string({ required_error: "Address Line 1 is required." })
      .min(1, "Address Line 1 cannot be empty.")
      .max(255, "Address Line 1 must not exceed 255 characters."),
    addressLine2: z
      .string()
      .max(255, "Address line 2 must not exceed 255 characters.")
      .optional()
      .nullable(),
    state: z
      .string({ required_error: "State is required." })
      .min(1, "State cannot be empty.")
      .max(100, "State must not exceed 100 characters."),
    city: z
      .string({ required_error: "City is required." })
      .min(1, "City cannot be empty.")
      .max(100, "City must not exceed 100 characters."),
    pincode: z
      .string({ required_error: "Pincode is required." })
      .min(1, "Pincode cannot be empty.")
      .max(10, "Pincode must not exceed 10 characters."),
    contactPersonName: z
      .string({ required_error: "Contact person name is required." })
      .min(1, "Contact name cannot be left blank.")
      .max(100, "Contact name must not exceed 100 characters.")
      .regex(
        /^[A-Za-z\s\u0900-\u097F]+$/,
        "Contact name can only contain letters and spaces."
      ),
    contactPersonPhone: z
      .string({ required_error: "Contact person phone is required." })
      .length(10, "Contact person phone must be exactly 10 digits."),
    contactPersonEmail: z
      .string({ required_error: "Contact person email is required." })
      .email("Contact person email must be a valid email address."),
    gstin: z
      .string()
      .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1}$/, {
        message: "Invalid GSTIN format (e.g., 07ABCDE1234F1Z5).",
      })
      .or(z.literal(""))
      .or(z.null())
      .optional(),

    // --- Subscription (Parsed from JSON) ---
    subscription: z.object(
      {
        packageId: z
          .number({
            required_error: "Package ID is required.",
            invalid_type_error: "Package ID must be a number.",
          })
          .int("Package ID must be an integer."),
        startDate: z
          .string({ required_error: "Subscription start date is required." })
          .refine((date) => !isNaN(Date.parse(date)), {
            message:
              "Start date must be a valid date string (e.g., YYYY-MM-DD).",
          }),
      },
      { required_error: "Subscription details are required." }
    ),

    // --- Initial Admin User (Parsed from JSON) ---
    user: z.object(
      {
        name: z
          .string({ required_error: "Admin user name is required." })
          .min(1, "User name cannot be left blank.")
          .max(100, "User name must not exceed 100 characters.")
          .regex(
            /^[A-Za-z\s\u0900-\u097F]+$/,
            "User name can only contain letters and spaces."
          ),
        email: z
          .string({ required_error: "Admin user email is required." })
          .email("User email must be a valid email address."),
        password: z
          .string({ required_error: "Admin user password is required." })
          .min(1, "User password cannot be empty."),
      },
      { required_error: "Initial admin user details are required." }
    ),
  })
  .superRefine(async (data, ctx) => {
    // --- Async DB Checks (Remain the same) ---
    // Check Package Existence
    if (data.subscription?.packageId) {
      const existingPackage = await prisma.package.findUnique({
        where: { id: data.subscription.packageId },
      });
      if (!existingPackage) {
        ctx.addIssue({
          path: ["subscription", "packageId"],
          message: `Package with ID ${data.subscription.packageId} does not exist.`,
          code: z.ZodIssueCode.custom,
        });
      }
    }
    // Check User Email Uniqueness
    if (data.user?.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.user.email },
      });
      if (existingUser) {
        ctx.addIssue({
          path: ["user", "email"],
          message: `An admin user with email ${data.user.email} already exists.`,
          code: z.ZodIssueCode.custom,
        });
      }
    }
    // Check Agency Contact Email Uniqueness
    if (data.contactPersonEmail) {
      const existingAgencyContact = await prisma.agency.findFirst({
        where: { contactPersonEmail: data.contactPersonEmail },
      });
      if (existingAgencyContact) {
        ctx.addIssue({
          path: ["contactPersonEmail"],
          message: `An agency with contact email ${data.contactPersonEmail} already exists.`,
          code: z.ZodIssueCode.custom,
        });
      }
    }
  });

const updateAgencyBodySchema = z
  .object({
    businessName: z.string().min(1).max(100).optional(),
    addressLine1: z.string().min(1).max(255).optional(),
    addressLine2: z.string().max(255).optional().nullable(),
    state: z.string().min(1).max(100).optional(),
    city: z.string().min(1).max(100).optional(),
    pincode: z.string().min(1).max(10).optional(),
    contactPersonName: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[A-Za-z\s\u0900-\u097F]+$/)
      .optional(),
    contactPersonPhone: z.string().length(10).optional(),
    contactPersonEmail: z.string().email().optional(),
    gstin: z
      .string()
      .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1}$/)
      .or(z.literal(""))
      .or(z.null())
      .optional(),
    // Add explicit null types for file fields to indicate removal intent
    logoFilename: z.string().nullable().optional(),
    letterheadFilename: z.string().nullable().optional(),
  })
  .strict();

// --- Controller Functions ---

const getAgencies = async (req, res, next) => {
  // ... (pagination, sorting, search logic remains the same) ...
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";
  const exportToExcel = req.query.export === "true";

  try {
    const whereClause = search
      ? {
          OR: [
            { businessName: { contains: search, mode: "insensitive" } },
            { contactPersonName: { contains: search, mode: "insensitive" } },
            { addressLine1: { contains: search, mode: "insensitive" } },
            { addressLine2: { contains: search, mode: "insensitive" } },
            { state: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
            { contactPersonEmail: { contains: search, mode: "insensitive" } },
            { contactPersonPhone: { contains: search } },
            { gstin: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const selectFields = {
      // ... (select other fields as before) ...
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
      uploadUUID: true, // Keep fetching these
      logoFilename: true,
      letterheadFilename: true, // Field name in DB
      currentSubscription: {
        select: {
          id: true,
          startDate: true,
          endDate: true,
          cost: true,
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
    };

    const agenciesRaw = await prisma.agency.findMany({
      where: whereClause,
      select: selectFields,
      skip: exportToExcel ? undefined : skip,
      take: exportToExcel ? undefined : limit,
      orderBy: exportToExcel ? undefined : { [sortBy]: sortOrder },
    });

    // Map to include URLs using the updated getFileUrl
    const agencies = agenciesRaw.map((agency) => ({
      ...agency,
      logoUrl: getFileUrl(
        AGENCY_MODULE_NAME, // moduleName
        "logo", // fieldName for logo
        agency.uploadUUID,
        agency.logoFilename
      ),
      letterheadUrl: getFileUrl(
        AGENCY_MODULE_NAME, // moduleName
        "letterHead", // fieldName for letterhead
        agency.uploadUUID,
        agency.letterheadFilename
      ),
    }));

    // --- Excel Export Logic (Updated URL access) ---
    if (exportToExcel) {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Agencies");

      worksheet.columns = [
        // ... (other columns remain the same) ...
        { header: "ID", key: "id", width: 10 },
        { header: "Business Name", key: "businessName", width: 30 },
        { header: "Address Line 1", key: "addressLine1", width: 30 },
        { header: "Address Line 2", key: "addressLine2", width: 30 },
        { header: "State", key: "state", width: 15 },
        { header: "City", key: "city", width: 15 },
        { header: "Pincode", key: "pincode", width: 10 },
        { header: "Contact Person", key: "contactPersonName", width: 25 },
        { header: "Contact Email", key: "contactPersonEmail", width: 30 },
        { header: "Contact Phone", key: "contactPersonPhone", width: 15 },
        { header: "GSTIN", key: "gstin", width: 20 },
        // Use the pre-constructed URLs from the 'agencies' map
        { header: "Logo URL", key: "logoUrl", width: 40 },
        { header: "Letterhead URL", key: "letterheadUrl", width: 40 },
        {
          header: "Subscription Start",
          key: "startDate",
          width: 15,
          style: { numFmt: "yyyy-mm-dd" },
        },
        {
          header: "Subscription End",
          key: "endDate",
          width: 15,
          style: { numFmt: "yyyy-mm-dd" },
        },
        { header: "Package Name", key: "packageName", width: 25 },
        {
          header: "Subscription Cost",
          key: "subscriptionCost",
          width: 15,
          style: { numFmt: "#,##0.00" },
        },
        {
          header: "Package Cost",
          key: "packageCost",
          width: 15,
          style: { numFmt: "#,##0.00" },
        },
      ];

      // Add rows using the mapped 'agencies' array
      agencies.forEach((agency) => {
        worksheet.addRow({
          id: agency.id,
          businessName: agency.businessName,
          addressLine1: agency.addressLine1,
          addressLine2: agency.addressLine2 ?? "", // Handle null
          state: agency.state,
          city: agency.city,
          pincode: agency.pincode,
          contactPersonName: agency.contactPersonName,
          contactPersonEmail: agency.contactPersonEmail,
          contactPersonPhone: agency.contactPersonPhone,
          gstin: agency.gstin ?? "", // Handle null
          logoUrl: agency.logoUrl || "N/A", // Use constructed URL
          letterheadUrl: agency.letterheadUrl || "N/A", // Use constructed URL
          startDate: agency.currentSubscription?.startDate
            ? dayjs(agency.currentSubscription.startDate).toDate()
            : null,
          endDate: agency.currentSubscription?.endDate
            ? dayjs(agency.currentSubscription.endDate).toDate()
            : null,
          packageName:
            agency.currentSubscription?.package?.packageName || "N/A",
          subscriptionCost: agency.currentSubscription?.cost ?? null,
          packageCost: agency.currentSubscription?.package?.cost ?? null,
        });
      });

      // ... (rest of Excel styling and response sending remains the same) ...
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="agencies_${dayjs().format("YYYYMMDD")}.xlsx"`
      );
      await workbook.xlsx.write(res);
      return res.end();
    }

    // --- Regular JSON Response ---
    const totalAgencies = await prisma.agency.count({ where: whereClause });
    const totalPages = Math.ceil(totalAgencies / limit);

    res.json({
      agencies, // Use the mapped array with correct URLs
      page,
      limit,
      totalPages,
      totalAgencies,
    });
  } catch (error) {
    console.error("Error fetching agencies:", error);
    next(createError(500, "Failed to fetch agencies."));
  }
};

const createAgency = async (req, res, next) => {
  try {
    // 1. Parse JSON fields (remains the same)
    let subscriptionData, userData;
    if (req.body.subscription) {
      try {
        subscriptionData = JSON.parse(req.body.subscription);
        req.body.subscription = subscriptionData;
      } catch (error) {
        return next(createError(400, "Invalid JSON format for subscription."));
      }
    }
    if (req.body.user) {
      try {
        userData = JSON.parse(req.body.user);
        req.body.user = userData;
      } catch (error) {
        return next(createError(400, "Invalid JSON format for user."));
      }
    }

    // 2. Validate Request Body + Files (remains the same)
    const validationResult = await validateRequest(
      createAgencyBodySchema,
      req.body,
      req.uploadErrors
    );

    if (!validationResult.success) {
      if (req.cleanupUpload) await req.cleanupUpload(req); // Cleanup on validation fail
      return res.status(400).json({ errors: validationResult.errors });
    }

    // 3. Extract Data and File Info (remains the same)
    const {
      /* ...validated body fields... */ businessName,
      addressLine1,
      addressLine2,
      state,
      city,
      pincode,
      contactPersonName,
      contactPersonPhone,
      contactPersonEmail,
      gstin,
      subscription,
      user,
    } = validationResult.data;
    const uploadUUID = req.uploadUUID; // Provided by middleware
    const logoFile = req.files?.logo?.[0];
    const letterheadFile = req.files?.letterHead?.[0];
    const logoFilename = logoFile ? logoFile.filename : null;
    const letterheadFilename = letterheadFile ? letterheadFile.filename : null;

    // --- Database Transaction (remains largely the same) ---
    const result = await prisma.$transaction(async (tx) => {
      // 4. Create Agency - Store UUID and filenames
      const newAgency = await tx.agency.create({
        data: {
          businessName,
          addressLine1,
          addressLine2: addressLine2 ?? null,
          state,
          city,
          pincode,
          contactPersonName,
          contactPersonPhone,
          contactPersonEmail,
          gstin: gstin ?? null,
          uploadUUID: uploadUUID, // Store the UUID from the request
          logoFilename: logoFilename,
          letterheadFilename: letterheadFilename,
        },
      });

      // 5. Fetch Package
      const existingPackage = await tx.package.findUniqueOrThrow({
        where: { id: subscription.packageId },
      });

      // 6. Calculate Subscription Dates
      const startDate = dayjs(subscription.startDate);
      const endDate = startDate
        .add(existingPackage.periodInMonths, "month")
        .endOf("day");

      // 7. Create Subscription
      const newSubscription = await tx.subscription.create({
        data: {
          packageId: subscription.packageId,
          cost: existingPackage.cost,
          startDate: startDate.startOf("day").toDate(),
          endDate: endDate.toDate(),
          agencyId: newAgency.id,
        },
      });

      // 8. Hash Password and Create User
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const newUser = await tx.user.create({
        data: {
          name: user.name,
          email: user.email,
          password: hashedPassword,
          role: "admin",
          agencyId: newAgency.id,
        },
      });

      // 9. Link Current Subscription
      await tx.agency.update({
        where: { id: newAgency.id },
        data: { currentSubscriptionId: newSubscription.id },
      });

      return {
        agency: newAgency,
        subscription: newSubscription,
        user: newUser,
      };
    });
    // --- End Transaction ---

    // --- Success Response (Updated URL construction) ---
    const { password, ...userWithoutPassword } = result.user;
    const responseAgency = {
      ...result.agency,
      logoUrl: getFileUrl(
        AGENCY_MODULE_NAME, // module
        "logo", // field
        result.agency.uploadUUID,
        result.agency.logoFilename
      ),
      letterheadUrl: getFileUrl(
        AGENCY_MODULE_NAME, // module
        "letterHead", // field
        result.agency.uploadUUID,
        result.agency.letterheadFilename
      ),
    };

    res.status(201).json({
      message: "Agency created successfully.",
      agency: responseAgency,
      subscription: result.subscription,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Error during agency creation:", error);
    // Cleanup on error (remains the same logic)
    if (req.cleanupUpload) {
      console.log("Attempting cleanup due to error during agency creation...");
      await req.cleanupUpload(req).catch((cleanupErr) => {
        console.error("Error during post-error cleanup:", cleanupErr);
      });
    }
    // Handle Specific Prisma Errors (remains the same)
    if (error.code === "P2002") {
      const field = error.meta?.target?.join(", ") || "field";
      let message = `An agency or related user already exists with this ${field}.`;
      if (field.includes("contactPersonEmail"))
        message = `An agency with contact email '${req.body?.contactPersonEmail}' already exists.`;
      if (field.includes("email") && field.includes("User"))
        message = `An admin user with email '${req.body?.user?.email}' already exists.`;
      return res
        .status(409)
        .json({ errors: { general: message, [field]: message } });
    }
    if (
      error.code === "P2025" ||
      error.message?.includes("not found during transaction")
    ) {
      return res.status(400).json({
        errors: { "subscription.packageId": "Related package not found." },
      });
    }
    next(createError(500, "Failed to create agency."));
  }
};

const getAgencyById = async (req, res, next) => {
  const { id } = req.params;
  const agencyId = parseInt(id, 10);

  if (isNaN(agencyId)) {
    return next(createError(400, "Invalid agency ID."));
  }

  try {
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      // Include relations as before
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true,
            branchId: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
        subscriptions: {
          include: { package: true },
          orderBy: { startDate: "desc" },
        },
      },
    });

    if (!agency) {
      return next(createError(404, `Agency with ID ${agencyId} not found.`));
    }

    // Add constructed URLs using updated helper
    const agencyWithDetails = {
      ...agency,
      logoUrl: getFileUrl(
        AGENCY_MODULE_NAME, // module
        "logo", // field
        agency.uploadUUID,
        agency.logoFilename
      ),
      letterheadUrl: getFileUrl(
        AGENCY_MODULE_NAME, // module
        "letterHead", // field
        agency.uploadUUID,
        agency.letterheadFilename
      ),
      addressLine2: agency.addressLine2 ?? "",
      gstin: agency.gstin ?? "",
    };

    res.status(200).json(agencyWithDetails);
  } catch (error) {
    console.error(`Error fetching agency by ID ${agencyId}:`, error);
    next(createError(500, `Failed to fetch agency ${agencyId}.`));
  }
};

// --- updateAgency (Significant changes in file handling) ---
const updateAgency = async (req, res, next) => {
  const { id } = req.params;
  const agencyId = parseInt(id, 10);
  const requestUploadUUID = req.uploadUUID; // UUID for *this* request's potential new uploads

  console.log(`[Update Start:${requestUploadUUID}] Updating agency ID: ${id}`);
  console.log(
    `[Update Files:${requestUploadUUID}] Req Files:`,
    req.files ? Object.keys(req.files) : "None"
  );
  console.log(`[Update Body:${requestUploadUUID}] Req Body:`, req.body);

  if (isNaN(agencyId)) {
    // No uploads likely happened yet, middleware cleanup handles if they did
    return next(createError(400, "Invalid agency ID."));
  }

  try {
    // 1. Validate Body + Check Middleware Upload Errors
    const validationResult = await validateRequest(
      updateAgencyBodySchema, // Use the updated schema allowing null for filenames
      req.body,
      req.uploadErrors
    );

    if (!validationResult.success) {
      console.log(
        `[Update Validation Fail:${requestUploadUUID}] Errors:`,
        validationResult.errors
      );
      if (req.cleanupUpload) await req.cleanupUpload(req); // Cleanup *this* request's uploads
      return res.status(400).json({ errors: validationResult.errors });
    }
    console.log(`[Update Validation OK:${requestUploadUUID}]`);

    // 2. Fetch Existing Agency Data (including file info)
    const existingAgency = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: {
        id: true,
        uploadUUID: true,
        logoFilename: true,
        letterheadFilename: true,
        contactPersonEmail: true, // For uniqueness check
        // Select other fields if needed for comparison later
      },
    });

    if (!existingAgency) {
      console.log(
        `[Update Error:${requestUploadUUID}] Agency ${agencyId} not found.`
      );
      if (req.cleanupUpload) await req.cleanupUpload(req); // Cleanup *this* request's uploads
      return next(createError(404, `Agency with ID ${agencyId} not found.`));
    }
    console.log(
      `[Update Found:${requestUploadUUID}] Existing Files: UUID=${existingAgency.uploadUUID}, Logo=${existingAgency.logoFilename}, LH=${existingAgency.letterheadFilename}`
    );

    // 3. Prepare Update: Determine target state and file operations
    const dataToUpdate = { ...validationResult.data }; // Start with validated body fields
    const newLogoFile = req.files?.logo?.[0];
    const newLetterheadFile = req.files?.letterHead?.[0]; // Match middleware field name
    const hasNewUploads = !!(newLogoFile || newLetterheadFile);
    const oldUploadUUID = existingAgency.uploadUUID;

    let targetUploadUUID = hasNewUploads ? requestUploadUUID : oldUploadUUID;
    if (hasNewUploads) {
      dataToUpdate.uploadUUID = targetUploadUUID; // Set DB field if new UUID is used
      console.log(
        `[Update Files:${requestUploadUUID}] New uploads detected. Target UUID = ${targetUploadUUID}`
      );
    } else {
      console.log(
        `[Update Files:${requestUploadUUID}] No new uploads. Target UUID = ${targetUploadUUID}`
      );
    }

    const filesToCopy = []; // { sourcePath: string, destPath: string, fieldName: string }
    const filesToDelete = []; // { fullPath: string, fieldName: string }

    // --- Logo Handling ---
    // Check if body explicitly requests removal (null value)
    const wantsToRemoveLogo =
      dataToUpdate.hasOwnProperty("logoFilename") &&
      dataToUpdate.logoFilename === null;

    if (newLogoFile) {
      // A. New logo uploaded
      dataToUpdate.logoFilename = newLogoFile.filename; // Update DB field
      console.log(
        `[Update Files:${requestUploadUUID}] New Logo: ${newLogoFile.filename}`
      );
      // Mark old logo for deletion if it existed
      if (oldUploadUUID && existingAgency.logoFilename) {
        filesToDelete.push({
          fullPath: path.join(
            UPLOAD_DIR_BASE,
            AGENCY_MODULE_NAME,
            "logo",
            oldUploadUUID,
            existingAgency.logoFilename
          ),
          fieldName: "logo",
        });
      }
    } else if (wantsToRemoveLogo) {
      // B. Explicitly removing logo (via null in body)
      dataToUpdate.logoFilename = null; // Ensure DB field is set to null
      console.log(
        `[Update Files:${requestUploadUUID}] Removing Logo explicit.`
      );
      // Mark old logo for deletion if it existed
      if (oldUploadUUID && existingAgency.logoFilename) {
        filesToDelete.push({
          fullPath: path.join(
            UPLOAD_DIR_BASE,
            AGENCY_MODULE_NAME,
            "logo",
            oldUploadUUID,
            existingAgency.logoFilename
          ),
          fieldName: "logo",
        });
      }
    } else {
      // C. No new logo, not removing: Keep existing file reference
      // Remove from dataToUpdate only if it wasn't explicitly set (to avoid overriding with undefined)
      if (!dataToUpdate.hasOwnProperty("logoFilename")) {
        delete dataToUpdate.logoFilename;
      }
      console.log(
        `[Update Files:${requestUploadUUID}] Keeping existing Logo ref.`
      );
      // *** Crucial: If UUID changed (due to other file upload), copy existing logo to new location ***
      if (hasNewUploads && oldUploadUUID && existingAgency.logoFilename) {
        const sourcePath = path.join(
          UPLOAD_DIR_BASE,
          AGENCY_MODULE_NAME,
          "logo",
          oldUploadUUID,
          existingAgency.logoFilename
        );
        const destPath = path.join(
          UPLOAD_DIR_BASE,
          AGENCY_MODULE_NAME,
          "logo",
          targetUploadUUID,
          existingAgency.logoFilename
        ); // Keep same filename
        filesToCopy.push({ sourcePath, destPath, fieldName: "logo" });
      }
    }

    // --- Letterhead Handling (Similar Logic) ---
    const wantsToRemoveLetterhead =
      dataToUpdate.hasOwnProperty("letterheadFilename") &&
      dataToUpdate.letterheadFilename === null;

    if (newLetterheadFile) {
      // A. New letterhead uploaded
      dataToUpdate.letterheadFilename = newLetterheadFile.filename; // Update DB field
      console.log(
        `[Update Files:${requestUploadUUID}] New Letterhead: ${newLetterheadFile.filename}`
      );
      if (oldUploadUUID && existingAgency.letterheadFilename) {
        filesToDelete.push({
          fullPath: path.join(
            UPLOAD_DIR_BASE,
            AGENCY_MODULE_NAME,
            "letterHead",
            oldUploadUUID,
            existingAgency.letterheadFilename
          ),
          fieldName: "letterhead",
        });
      }
    } else if (wantsToRemoveLetterhead) {
      // B. Explicitly removing letterhead
      dataToUpdate.letterheadFilename = null; // Ensure DB field is null
      console.log(
        `[Update Files:${requestUploadUUID}] Removing Letterhead explicit.`
      );
      if (oldUploadUUID && existingAgency.letterheadFilename) {
        filesToDelete.push({
          fullPath: path.join(
            UPLOAD_DIR_BASE,
            AGENCY_MODULE_NAME,
            "letterHead",
            oldUploadUUID,
            existingAgency.letterheadFilename
          ),
          fieldName: "letterhead",
        });
      }
    } else {
      // C. Keep existing letterhead
      if (!dataToUpdate.hasOwnProperty("letterheadFilename")) {
        delete dataToUpdate.letterheadFilename;
      }
      console.log(
        `[Update Files:${requestUploadUUID}] Keeping existing Letterhead ref.`
      );
      if (hasNewUploads && oldUploadUUID && existingAgency.letterheadFilename) {
        const sourcePath = path.join(
          UPLOAD_DIR_BASE,
          AGENCY_MODULE_NAME,
          "letterHead",
          oldUploadUUID,
          existingAgency.letterheadFilename
        );
        const destPath = path.join(
          UPLOAD_DIR_BASE,
          AGENCY_MODULE_NAME,
          "letterHead",
          targetUploadUUID,
          existingAgency.letterheadFilename
        );
        filesToCopy.push({ sourcePath, destPath, fieldName: "letterhead" });
      }
    }

    // --- Optional: Nullify UUID if both final files are null AND no new UUID was generated ---
    const finalLogoFilename = dataToUpdate.hasOwnProperty("logoFilename")
      ? dataToUpdate.logoFilename
      : existingAgency.logoFilename;
    const finalLetterheadFilename = dataToUpdate.hasOwnProperty(
      "letterheadFilename"
    )
      ? dataToUpdate.letterheadFilename
      : existingAgency.letterheadFilename;

    if (
      finalLogoFilename === null &&
      finalLetterheadFilename === null &&
      !hasNewUploads &&
      oldUploadUUID
    ) {
      // If both are cleared, and we didn't create a new UUID folder for this request,
      // we can nullify the reference in the DB. The files should already be marked for deletion.
      console.log(
        `[Update Files:${requestUploadUUID}] Both files null, no new uploads. Nullifying UUID.`
      );
      dataToUpdate.uploadUUID = null;
      targetUploadUUID = null; // Update local variable too
    } else if (
      finalLogoFilename === null &&
      finalLetterheadFilename === null &&
      hasNewUploads
    ) {
      // If both are cleared, but we *did* create a new UUID (which is now empty),
      // still nullify the DB reference, but the cleanup function for *this request* should handle the empty new folders.
      console.log(
        `[Update Files:${requestUploadUUID}] Both files null, new UUID created (will be empty). Nullifying UUID in DB.`
      );
      dataToUpdate.uploadUUID = null;
      targetUploadUUID = null;
    }

    // 4. Check Contact Email Uniqueness (if changed) - Remains the same
    if (
      dataToUpdate.contactPersonEmail &&
      dataToUpdate.contactPersonEmail !== existingAgency.contactPersonEmail
    ) {
      const conflictingAgency = await prisma.agency.findUnique({
        where: { contactPersonEmail: dataToUpdate.contactPersonEmail },
        select: { id: true },
      });
      if (conflictingAgency && conflictingAgency.id !== agencyId) {
        console.log(
          `[Update Conflict:${requestUploadUUID}] Email conflict: ${dataToUpdate.contactPersonEmail}`
        );
        if (req.cleanupUpload) await req.cleanupUpload(req); // Cleanup *this request's* uploads
        return res.status(409).json({
          errors: {
            contactPersonEmail: `Email '${dataToUpdate.contactPersonEmail}' is already in use.`,
          },
        });
      }
    }

    // 5. Check if any actual changes (DB fields or file operations)
    const hasDbFieldChanges = Object.keys(dataToUpdate).some(
      (key) => dataToUpdate[key] !== existingAgency[key]
    );
    // File actions include copies, deletes, or simply updating the filename/UUID ref in DB
    const hasFileActions =
      filesToCopy.length > 0 ||
      filesToDelete.length > 0 ||
      dataToUpdate.hasOwnProperty("logoFilename") ||
      dataToUpdate.hasOwnProperty("letterheadFilename") ||
      dataToUpdate.hasOwnProperty("uploadUUID");

    if (!hasDbFieldChanges && !hasFileActions) {
      console.log(
        `[Update No Changes:${requestUploadUUID}] No effective changes.`
      );
      // Cleanup *this request's* potentially unused upload directory IF it was created
      if (req.cleanupUpload && hasNewUploads) {
        await req.cleanupUpload(req);
      }

      // Return current data
      const currentFullAgency = await prisma.agency.findUnique({
        where: { id: agencyId },
      }); // Fetch full data
      return res.status(200).json({
        message: "No changes applied.",
        agency: {
          ...currentFullAgency,
          logoUrl: getFileUrl(
            AGENCY_MODULE_NAME,
            "logo",
            currentFullAgency.uploadUUID,
            currentFullAgency.logoFilename
          ),
          letterheadUrl: getFileUrl(
            AGENCY_MODULE_NAME,
            "letterHead",
            currentFullAgency.uploadUUID,
            currentFullAgency.letterheadFilename
          ),
        },
      });
    }

    console.log(
      `[Update Changes:${requestUploadUUID}] Changes detected. DB Data:`,
      dataToUpdate
    );
    console.log(
      `[Update Changes:${requestUploadUUID}] Files to Copy:`,
      filesToCopy.map((f) => f.fieldName)
    );
    console.log(
      `[Update Changes:${requestUploadUUID}] Files to Delete:`,
      filesToDelete.map((f) => f.fieldName)
    );

    // 6. Perform Database Update
    const updatedAgency = await prisma.agency.update({
      where: { id: agencyId },
      data: dataToUpdate,
    });
    console.log(`[Update DB Success:${requestUploadUUID}] DB updated.`);

    // 7. Perform Post-DB File Operations (Copy, Delete)
    let fileOpErrors = [];

    // --- 7a. Copy necessary files ---
    if (filesToCopy.length > 0) {
      console.log(`[Update File Ops:${requestUploadUUID}] Copying files...`);
      await Promise.all(
        filesToCopy.map(async (op) => {
          try {
            const destDir = path.dirname(op.destPath);
            await fs.mkdir(destDir, { recursive: true }); // Ensure destination dir exists
            await fs.copyFile(op.sourcePath, op.destPath);
            console.log(
              `[Update File Ops:${requestUploadUUID}] Copied ${
                op.fieldName
              }: ${path.basename(op.sourcePath)} -> ${path.basename(
                op.destPath
              )}`
            );
          } catch (err) {
            console.error(
              `[Update File Ops ERROR:${requestUploadUUID}] Failed to copy ${op.fieldName} from ${op.sourcePath} to ${op.destPath}:`,
              err
            );
            fileOpErrors.push(`Failed to copy ${op.fieldName}.`);
          }
        })
      );
    }

    // --- 7b. Delete old/replaced files ---
    if (filesToDelete.length > 0) {
      console.log(
        `[Update File Ops:${requestUploadUUID}] Deleting old files...`
      );
      await Promise.all(
        filesToDelete.map(async (op) => {
          try {
            await fs.unlink(op.fullPath);
            console.log(
              `[Update File Ops:${requestUploadUUID}] Deleted old ${op.fieldName} file: ${op.fullPath}`
            );
          } catch (err) {
            if (err.code === "ENOENT") {
              console.log(
                `[Update File Ops:${requestUploadUUID}] Old ${op.fieldName} file not found (OK): ${op.fullPath}`
              );
            } else {
              console.error(
                `[Update File Ops ERROR:${requestUploadUUID}] Failed to delete old ${op.fieldName} file ${op.fullPath}:`,
                err
              );
              fileOpErrors.push(`Failed to delete old ${op.fieldName} file.`);
            }
          }
        })
      );
    }

    // --- NOTE: No directory cleanup here ---
    // We are only deleting specific files. The middleware handles cleanup for *this request*.
    // Old, potentially empty directories from previous UUIDs might remain.

    // 8. Success Response
    console.log(`[Update Success:${requestUploadUUID}] Process completed.`);
    const responsePayload = {
      message: "Agency updated successfully.",
      agency: {
        ...updatedAgency, // Use the final state from DB
        logoUrl: getFileUrl(
          AGENCY_MODULE_NAME,
          "logo",
          updatedAgency.uploadUUID,
          updatedAgency.logoFilename
        ),
        letterheadUrl: getFileUrl(
          AGENCY_MODULE_NAME,
          "letterHead",
          updatedAgency.uploadUUID,
          updatedAgency.letterheadFilename
        ),
      },
    };
    if (fileOpErrors.length > 0) {
      responsePayload.warnings = fileOpErrors; // Include warnings if file ops failed
      console.warn(
        `[Update Success:${requestUploadUUID}] Update finished with file operation warnings:`,
        fileOpErrors
      );
    }

    res.status(200).json(responsePayload);
  } catch (error) {
    // --- Error Handling ---
    console.error(
      `[Update FATAL ERROR:${requestUploadUUID}] Error updating agency ${agencyId}:`,
      error
    );
    // Cleanup *this request's* uploads if error occurred after validation
    if (req.cleanupUpload) {
      console.log(
        `[Update Error Cleanup:${requestUploadUUID}] Attempting cleanup...`
      );
      await req.cleanupUpload(req).catch((cleanupErr) => {
        console.error(
          `[Update Error Cleanup:${requestUploadUUID}] Cleanup failed:`,
          cleanupErr
        );
      });
    }

    // Handle specific Prisma errors (remain the same)
    if (error.code === "P2025")
      return next(
        createError(404, `Update failed: Agency ${agencyId} not found.`)
      );
    if (error.code === "P2002") {
      const field = error.meta?.target?.join(", ") || "field";
      return res.status(409).json({
        errors: {
          general: `Unique constraint violation on ${field}.`,
          ...(field === "contactPersonEmail" && {
            contactPersonEmail: `Email already in use.`,
          }),
        },
      });
    }
    next(createError(500, `Failed to update agency ${agencyId}.`));
  }
};

const deleteAgency = async (req, res, next) => {
  const { id } = req.params;
  const agencyId = parseInt(id, 10);

  if (isNaN(agencyId)) {
    return next(createError(400, "Invalid agency ID."));
  }

  try {
    // 1. Fetch agency UUID BEFORE deleting
    const agencyToDelete = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: { uploadUUID: true }, // Need UUID for file cleanup
    });

    if (!agencyToDelete) {
      return next(createError(404, `Agency with ID ${agencyId} not found.`));
    }

    // 2. Delete the agency record (Prisma handles cascades if set)
    await prisma.agency.delete({
      where: { id: agencyId },
    });
    console.log(`[Delete] DB record for agency ${agencyId} deleted.`);

    // 3. Delete associated upload files/directories (AFTER successful DB delete)
    if (agencyToDelete.uploadUUID) {
      const uuid = agencyToDelete.uploadUUID;
      const fieldsToDelete = ["logo", "letterHead"]; // Fields associated with this module

      console.log(`[Delete] Attempting file cleanup for UUID: ${uuid}`);
      for (const fieldName of fieldsToDelete) {
        const fieldDirPath = path.join(
          UPLOAD_DIR_BASE,
          AGENCY_MODULE_NAME,
          fieldName,
          uuid
        );
        try {
          console.log(`[Delete] Removing directory: ${fieldDirPath}`);
          // Use fs.rm to remove the field-specific directory and its contents within the UUID folder
          await fs.rm(fieldDirPath, { recursive: true, force: true });
          console.log(`[Delete] Removed ${fieldDirPath} (or it didn't exist).`);
        } catch (err) {
          // Log error but don't fail the request
          console.error(
            `[Delete] Failed to remove directory ${fieldDirPath} for deleted agency ${agencyId}:`,
            err
          );
        }
      }
      // Optional: Try removing the module's top-level UUID folder if it's now empty
      // This is more complex and might have race conditions. Sticking to field dir removal is safer.
      /*
      const moduleUUIDPath = path.join(UPLOAD_DIR_BASE, AGENCY_MODULE_NAME, uuid);
       try {
           await fs.rmdir(moduleUUIDPath); // rmdir fails if not empty
           console.log(`[Delete] Successfully removed now-empty module UUID directory: ${moduleUUIDPath}`);
       } catch (err) {
           if (err.code !== 'ENOENT' && err.code !== 'ENOTEMPTY') { // Ignore "not found" or "not empty"
              console.error(`[Delete] Error trying to remove module UUID directory ${moduleUUIDPath}:`, err);
           }
       }
       */
    } else {
      console.log(
        `[Delete] Agency ${agencyId} had no upload UUID. No file cleanup needed.`
      );
    }

    // 4. Success Response
    res.status(204).send();
  } catch (error) {
    console.error(`Error deleting agency ${agencyId}:`, error);
    if (error.code === "P2025") {
      return next(createError(404, `Agency with ID ${agencyId} not found.`));
    }
    next(createError(500, `Failed to delete agency ${agencyId}.`));
  }
};

module.exports = {
  getAgencies,
  createAgency,
  getAgencyById,
  updateAgency,
  deleteAgency,
};
