const { PrismaClient } = require("@prisma/client");
const createError = require("http-errors");
const prisma = new PrismaClient();
const { z } = require("zod"); // Import Zod for validation
const validateRequest = require("../utils/validateRequest"); // Utility function for validation
const dayjs = require("dayjs"); // Import dayjs
const { numberToWords } = require("../utils/numberToWords");
const generateSubscriptionInvoiceNumber = require("../utils/generateSubscriptionInvoiceNumber");
const {
  generateSubscriptionInvoice,
} = require("../utils/Invoice/generateSubscriptionInvoice");
const fs = require("fs").promises; // Use promises API
const path = require("path");
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

const generateSubscriptionInvoicePdf = async (req, res) => {
  const { id } = req.params;
  console.log("Received Subscription ID:", id); // Debugging line to ensure it's correct

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Fetch existing booking receipt
      const existingInvoice = await tx.subscription.findUnique({
        where: { id: parseInt(id, 10) },
        select: { invoiceNumber: true }, // only fetch needed field
      });
      let subscription = null;
      // Step 2: Check if invoice number already exists
      if (existingInvoice.invoiceNumber) {
        // Don't update invoice number, just return existing
        subscription = await tx.subscription.update({
          where: { id: parseInt(id, 10) },
          data: {
            invoiceDate: new Date(),
          },
        });
      } else {
        const invoiceNumber = await generateSubscriptionInvoiceNumber(tx);

        subscription = await tx.subscription.update({
          where: { id: parseInt(id, 10) },
          data: {
            invoiceDate: new Date(),
            invoiceNumber: invoiceNumber,
          },
        });
      }

      return {
        subscription: subscription,
      };
    });

    const subscriptionData = await prisma.subscription.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        agency: true,
        package: true,
      },
    });

    if (!subscriptionData) {
      return res.status(404).json({ error: "Subscription details not found" });
    }

    // ✅ Step 2: Format data for generateInvoicePdf
    const invoiceData = {
      invoiceNumber: subscriptionData.invoiceNumber,
      invoiceDate: subscriptionData.invoiceDate,
      client: {
        clientName: subscriptionData.agency?.businessName,
        addressLines: [
          subscriptionData.agency?.addressLine1 || "",
          subscriptionData.agency?.addressLine2 || "",
        ].filter(Boolean),
        city: subscriptionData.agency?.cityName || "",
        pincode: subscriptionData.agency?.pincode || "",
        gstin: subscriptionData.agency?.gstin || "",
      },
      sanmishaDetails: {
        name: "Sanmisha Technologies",
        addressLines: ["Dombivli East", ""],
        city: "Dombivli", // Optional
        pincode: "400605", // Optional
        gstin: "27AANCS1234C1Z5", // Optional
        email: "amar@sanmisha.com",
        logoPath: path.join(__dirname, "..", "assets", "brandlogo.png"), // Optional logo
      },
      items: [
        {
          srNo: 1,
          description: `${subscriptionData?.package?.packageName}`,
          hsnSac: "998551", // or pull this from somewhere
          amount: parseFloat(subscriptionData.cost),
        },
      ],
      totals: {
        amountBeforeTax: parseFloat(subscriptionData.cost),
        cgstAmount: parseFloat(subscriptionData.cgstAmount || 0),
        cgstRate: subscriptionData.cgstPercent || 0,
        sgstAmount: parseFloat(subscriptionData.sgstAmount || 0),
        sgstRate: subscriptionData.sgstPercent || 0,
        igstAmount: parseFloat(subscriptionData.igstAmount || 0),
        igstRate: subscriptionData.igstPercent || 0,
        totalAmount: parseFloat(subscriptionData.totalAmount),
        amountInWords: numberToWords(parseFloat(subscriptionData.totalAmount)), // Optional: convert to words using a helper
      },
    };

    // ✅ Step 3: Define file path
    const filePath = path.join(
      __dirname,
      "..",
      "invoices",
      "subscriptions",
      `invoice-${subscriptionData.id}.pdf`
    );
    console.log("Writing PDF to:", filePath);

    // ✅ Step 4: Generate the PDF
    await generateSubscriptionInvoice(invoiceData, filePath);
    await prisma.subscription.update({
      where: { id: parseInt(id, 10) },
      data: {
        invoicePath: filePath, // Save relative or absolute path based on your use-case
      },
    });

    res.setHeader("Content-Type", "application/pdf");

    // ✅ Step 5: Send file to client
    res.download(filePath, (err) => {
      if (err) {
        console.error("Download error:", err);
        res.status(500).send("Failed to download invoice");
      } else {
        // Optionally delete file after download
        // fs.unlink(filePath, () => {});
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      errors: {
        message: "Failed to generate invoice",
        details: error.message,
      },
    });
  }
};

module.exports = {
  createSubscription,
  generateSubscriptionInvoicePdf,
};
