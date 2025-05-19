const { PrismaClient } = require("@prisma/client");
const createError = require("http-errors");
const prisma = new PrismaClient();
const { z } = require("zod"); // Import Zod for validation
const validateRequest = require("../utils/validateRequest"); // Utility function for validation
const dayjs = require("dayjs"); // Import dayjs

const createSubscription = async (req, res, next) => {
  // Define Zod schema for subscription validation
  const schema = z
    .object({
      packageId: z
        .number({
          required_error: "Package ID is required.",
          invalid_type_error: "Package ID must be a number.",
        })
        .int("Package ID must be an integer."),
      agencyId: z
        .number({
          required_error: "Agency ID is required.",
          invalid_type_error: "Agency ID must be a number.",
        })
        .int("Agency ID must be an integer."),
      // amount details
      cgstPercent: z
        .union([z.string(), z.number()])
        .transform(parseFloat)
        .refine((val) => !isNaN(val) && val >= 0 && val <= 100, {
          message: "Invalid CGST percent",
        })
        .optional(),

      cgstAmount: z
        .union([z.string(), z.number()])
        .transform(parseFloat)
        .refine((val) => !isNaN(val) && val >= 0, {
          message: "Invalid CGST amount",
        })
        .optional(),

      sgstPercent: z
        .union([z.string(), z.number()])
        .transform(parseFloat)
        .refine((val) => !isNaN(val) && val >= 0 && val <= 100, {
          message: "Invalid SGST percent",
        })
        .optional(),

      sgstAmount: z
        .union([z.string(), z.number()])
        .transform(parseFloat)
        .refine((val) => !isNaN(val) && val >= 0, {
          message: "Invalid SGST amount",
        })
        .optional(),

      igstPercent: z
        .union([z.string(), z.number()])
        .transform(parseFloat)
        .refine((val) => !isNaN(val) && val >= 0 && val <= 100, {
          message: "Invalid IGST percent",
        })
        .optional(),

      igstAmount: z
        .union([z.string(), z.number()])
        .transform(parseFloat)
        .refine((val) => !isNaN(val) && val >= 0, {
          message: "Invalid IGST amount",
        })
        .optional(),

      totalAmount: z
        .union([z.string(), z.number()])
        .transform(parseFloat)
        .refine((val) => !isNaN(val) && val >= 0, {
          message: "Total amount must be a positive number",
        }),

      paymentDate: z.string().optional(), // works with "YYYY-MM-DD"

      paymentMode: z.string().min(1, "Payment mode is required"),

      utrNumber: z.string().optional(),
      neftImpfNumber: z.string().optional(),
      chequeNumber: z.string().optional(),
      chequeDate: z.string().optional(),
      bankName: z.string().optional(),
      // amiunt details end
    })
    .superRefine(async (data, ctx) => {
      // Check if the package exists
      const packageData = await prisma.package.findUnique({
        where: { id: parseInt(data.packageId) },
      });

      if (!packageData) {
        ctx.addIssue({
          path: ["packageId"],
          message: "Package does not exist with the provided packageId.",
        });
      }

      // Check if the agency exists
      const agencyData = await prisma.agency.findUnique({
        where: { id: parseInt(data.agencyId) },
        include: { currentSubscription: true },
      });

      if (!agencyData) {
        ctx.addIssue({
          path: ["agencyId"],
          message: "Agency does not exist with the provided agencyId.",
        });
      }
    });

  // Validate the request body using Zod
  const validationErrors = await validateRequest(schema, req.body, res);
  const {
    packageId,
    agencyId,
    paymentDate,
    paymentMode,
    utrNumber,
    neftImpfNumber,
    chequeNumber,
    chequeDate,
    bankName,
    cgstPercent,
    cgstAmount,
    sgstPercent,
    sgstAmount,
    igstPercent,
    igstAmount,
    totalAmount,
  } = req.body;

  try {
    // Get agency data to retrieve currentSubscriptionId
    const agencyData = await prisma.agency.findUnique({
      where: { id: agencyId },
      include: { currentSubscription: true }, // Include current subscription details
    });

    // Determine the startDate for the new subscription
    let startDate;
    if (agencyData.currentSubscription) {
      // Use the endDate of the current subscription as the startDate for the new subscription
      // startDate = dayjs(agencyData.currentSubscription.endDate);
      startDate = dayjs(agencyData.currentSubscription.endDate).add(1, "day");
    } else {
      // If no current subscription, send an error
      return res.status(400).json({
        errors: {
          message:
            "No current subscription exists for the provided agency. Cannot create a new subscription.",
        },
      });
    }

    // Calculate the endDate for the new subscription
    const packageData = await prisma.package.findUnique({
      where: { id: packageId },
    });
    const endDate = startDate.add(packageData.periodInMonths, "month");

    // Create the new subscription
    const newSubscription = await prisma.subscription.create({
      data: {
        packageId,
        agencyId,
        startDate: startDate.toDate(), // Convert dayjs object to JavaScript Date
        endDate: endDate.toDate(), // Convert dayjs object to JavaScript Date
        cost: packageData.cost,
        paymentDate: paymentDate
          ? dayjs(paymentDate).startOf("day").toDate()
          : null,
        paymentMode: paymentMode,
        utrNumber: utrNumber || null,
        neftImpfNumber: neftImpfNumber || null,
        chequeNumber: chequeNumber || null,
        chequeDate: chequeDate
          ? dayjs(chequeDate).startOf("day").toDate()
          : null,
        bankName: bankName || null,
        cgstPercent: cgstPercent ? parseFloat(cgstPercent) : null,
        cgstAmount: cgstAmount ? parseFloat(cgstAmount) : null,
        sgstPercent: sgstPercent ? parseFloat(sgstPercent) : null,
        sgstAmount: sgstAmount ? parseFloat(sgstAmount) : null,
        igstPercent: igstPercent ? parseFloat(igstPercent) : null,
        igstAmount: igstAmount ? parseFloat(igstAmount) : null,
        totalAmount: parseFloat(totalAmount),
      },
    });

    // Update the agency's currentSubscriptionId with the new subscription ID
    await prisma.agency.update({
      where: { id: agencyId },
      data: { currentSubscriptionId: newSubscription.id },
    });

    res.status(201).json(newSubscription);
  } catch (error) {
    next(error); // Pass the error to the centralized error handler
  }
};

module.exports = {
  createSubscription,
};
