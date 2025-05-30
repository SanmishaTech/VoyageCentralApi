const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../../utils/validateRequest");
const dayjs = require("dayjs");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const {
  generateBookingReceiptInvoice,
} = require("../../utils/Invoice/generateBookingReceiptInvoice");
const parseDate = (value) => {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  return dayjs(value).isValid() ? new Date(value) : undefined;
};
const { numberToWords } = require("../../utils/numberToWords");
const generateBookingReceiptNumber = require("../../utils/generateBookingReceiptNumber");
const generateBookingReceiptInvoiceNumber = require("../../utils/generateBookingReceiptInvoiceNumber");
// Create a new booking receipt
const createGroupClientBookingReceipt = async (req, res) => {
  const schema = z.object({
    receiptDate: z.string().min(1, "Receipt date is required"),
    paymentMode: z.string().min(1, "Payment mode is required"),
    amount: z
      .union([z.string(), z.number()])
      .transform((val) => parseFloat(val)),
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
  });

  if (!req.user.agencyId) {
    return res
      .status(404)
      .json({ message: "User does not belong to any Agency" });
  }

  const validationResult = await validateRequest(schema, req.body, res);
  const { groupClientBookingId } = req.params;

  const {
    receiptDate,
    paymentMode,
    amount,
    bankId,
    chequeDate,
    chequeNumber,
    utrNumber,
    neftImpfNumber,
    cgstPercent,
    cgstAmount,
    sgstPercent,
    sgstAmount,
    igstPercent,
    igstAmount,
    totalAmount,
    paymentDate,
    description,
  } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const receiptNumber = await generateBookingReceiptNumber(
        tx,
        parseInt(req.user.agencyId)
      );

      const newReceipt = await tx.bookingReceipt.create({
        data: {
          // agencyId: parseInt(req.user.agencyId),
          // bookingId: parseInt(id),
          // bankId: bankId ? parseInt(bankId) : null,
          agency: {
            connect: { id: parseInt(req.user.agencyId) },
          },
          groupClient: {
            connect: { id: parseInt(groupClientBookingId) },
          },
          bank: bankId
            ? {
                connect: {
                  id: parseInt(bankId),
                },
              }
            : undefined, // Omit if no bankId is provided
          receiptNumber: receiptNumber,
          description,
          receiptDate: parseDate(receiptDate),
          paymentMode,
          amount: amount ? parseFloat(amount) : null,
          chequeDate: chequeDate ? parseDate(chequeDate) : null,
          chequeNumber,
          utrNumber,
          neftImpfNumber,
          cgstPercent: cgstPercent ? parseFloat(cgstPercent) : null,
          cgstAmount: cgstAmount ? parseFloat(cgstAmount) : null,
          sgstPercent: sgstPercent ? parseFloat(sgstPercent) : null,
          sgstAmount: sgstAmount ? parseFloat(sgstAmount) : null,
          igstPercent: igstPercent ? parseFloat(igstPercent) : null,
          igstAmount: igstAmount ? parseFloat(igstAmount) : null,
          totalAmount: new Prisma.Decimal(totalAmount),
          paymentDate: paymentDate ? parseDate(paymentDate) : null,
          paymentDate: paymentDate ? parseDate(paymentDate) : null,
        },
      });

      return {
        newReceipt: newReceipt,
      };
    });
    res.status(201).json(result.newReceipt);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to create booking receipt",
        details: error.message,
      },
    });
  }
};

// Get a booking receipt by ID
const getGroupClientBookingReceiptById = async (req, res) => {
  const { bookingReceiptId } = req.params;
  try {
    const receipt = await prisma.bookingReceipt.findUnique({
      where: { id: parseInt(bookingReceiptId, 10) },
    });
    if (!receipt) {
      return res
        .status(404)
        .json({ errors: { message: "Booking receipt not found" } });
    }
    res.status(200).json(receipt);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch booking receipt",
        details: error.message,
      },
    });
  }
};

// Update a booking receipt
const updateGroupClientBookingReceipt = async (req, res) => {
  const schema = z.object({
    receiptDate: z.string().min(1, "Receipt date is required"),
    paymentMode: z.string().min(1, "Payment mode is required"),
    amount: z
      .union([z.string(), z.number()])
      .transform((val) => parseFloat(val)),
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
  });

  if (!req.user.agencyId) {
    return res
      .status(404)
      .json({ message: "User does not belong to any Agency" });
  }

  const validationResult = await validateRequest(schema, req.body, res);
  const { bookingReceiptId } = req.params;

  const {
    receiptDate,
    paymentMode,
    amount,
    bankId,
    chequeDate,
    chequeNumber,
    utrNumber,
    neftImpfNumber,
  } = req.body;

  try {
    const updatedReceipt = await prisma.bookingReceipt.update({
      where: { id: parseInt(bookingReceiptId, 10) },
      data: {
        receiptDate: parseDate(receiptDate),
        paymentMode,
        amount: parseFloat(amount),
        bankId: bankId ? parseInt(bankId) : null,
        chequeDate: chequeDate ? parseDate(chequeDate) : null,
        chequeNumber,
        utrNumber,
        neftImpfNumber,
      },
    });
    res.status(200).json(updatedReceipt);
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ errors: { message: "Booking receipt not found" } });
    }
    res.status(500).json({
      errors: {
        message: "Failed to update booking receipt",
        details: error.message,
      },
    });
  }
};

// Delete a booking receipt
const deleteGroupClientBookingReceipt = async (req, res) => {
  const { bookingReceiptId } = req.params;
  try {
    await prisma.bookingReceipt.delete({
      where: { id: parseInt(bookingReceiptId, 10) },
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ errors: { message: "Booking receipt not found" } });
    }
    res.status(500).json({
      errors: {
        message: "Failed to delete booking receipt",
        details: error.message,
      },
    });
  }
};

// Get all booking receipts for a booking
const getAllBookingReceiptsByGroupClientBookingId = async (req, res) => {
  const { groupClientBookingId } = req.params;
  try {
    const receipts = await prisma.bookingReceipt.findMany({
      where: { groupClientId: parseInt(groupClientBookingId, 10) },
      orderBy: { id: "desc" },
    });
    res.status(200).json({ bookingReceipts: receipts });
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch booking receipts",
        details: error.message,
      },
    });
  }
};

const generateGroupClientInvoice = async (req, res) => {
  const { bookingReceiptId } = req.params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Fetch existing booking receipt
      const existingInvoice = await tx.bookingReceipt.findUnique({
        where: { id: parseInt(bookingReceiptId, 10) },
        select: { invoiceNumber: true }, // only fetch needed field
      });
      let updateBookingReceipt = null;
      // Step 2: Check if invoice number already exists
      if (existingInvoice.invoiceNumber) {
        // Don't update invoice number, just return existing
        updateBookingReceipt = await tx.bookingReceipt.update({
          where: { id: parseInt(bookingReceiptId, 10) },
          data: {
            invoiceDate: new Date(),
          },
        });
      } else {
        const invoiceNumber = await generateBookingReceiptInvoiceNumber(
          tx,
          parseInt(req.user.agencyId)
        );

        updateBookingReceipt = await tx.bookingReceipt.update({
          where: { id: parseInt(bookingReceiptId, 10) },
          data: {
            invoiceDate: new Date(),
            invoiceNumber: invoiceNumber,
          },
        });
      }

      return {
        updateBookingReceipt: updateBookingReceipt,
      };
    });

    const receipt = await prisma.bookingReceipt.findUnique({
      where: { id: parseInt(bookingReceiptId, 10) },
      include: {
        booking: {
          include: {
            client: {
              include: {
                city: true,
                state: true,
              },
            },
          },
        },
        agency: true,
        bank: true,
      },
    });

    if (!receipt) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    // ✅ Step 2: Format data for generateInvoicePdf
    const invoiceData = {
      invoiceNumber: receipt.invoiceNumber,
      invoiceDate: receipt.invoiceDate,
      client: {
        clientName: receipt.booking?.client?.clientName,
        addressLines: [
          receipt.booking?.client?.address1 || "",
          receipt.booking?.client?.address2 || "",
        ].filter(Boolean),
        city: receipt.booking?.client?.city?.cityName || "",
        pincode: receipt.booking?.client?.pincode || "",
        gstinUin: receipt.booking?.client?.gstin || "",
      },
      agencyDetails: {
        name: receipt.agency.businessName,
        addressLines: [
          receipt.agency.addressLine1 || "",
          receipt.agency.addressLine2 || "",
        ],
        city: receipt.agency.cityName || "", // Optional
        pincode: receipt.agency.pincode || "", // Optional
        gstin: receipt.agency.gstin || "",
        email: receipt.agency.contactPersonEmail || "",
        logoPath: path.join(__dirname, "..", "assets", "brandlogo.png"), // Optional logo
      },
      items: [
        {
          srNo: 1,
          description: `${receipt.description}`,
          hsnSac: "998551", // or pull this from somewhere
          amount: parseFloat(receipt.amount),
        },
      ],
      totals: {
        amountBeforeTax: parseFloat(receipt.amount),
        cgstAmount: parseFloat(receipt.cgstAmount || 0),
        cgstRate: receipt.cgstPercent || 0,
        sgstAmount: parseFloat(receipt.sgstAmount || 0),
        sgstRate: receipt.sgstPercent || 0,
        igstAmount: parseFloat(receipt.igstAmount || 0),
        igstRate: receipt.igstPercent || 0,
        totalAmount: parseFloat(receipt.totalAmount),
        amountInWords: numberToWords(parseFloat(receipt.totalAmount)), // Optional: convert to words using a helper
      },
    };

    // ✅ Step 3: Define file path

    const oldPath = receipt.invoicePath;
    const sanitizedInvoiceNumber = receipt.invoiceNumber.replace(
      /[\/\\]/g,
      "-"
    );
    const uuidFolder = uuidv4();
    const invoiceDir = path.join(
      __dirname,
      "..",
      "..",
      "invoices",
      "groupBooking",
      "bookingReceipt",
      uuidFolder
    );
    const filePath = path.join(
      invoiceDir,
      `invoice-${sanitizedInvoiceNumber}.pdf`
    );

    if (oldPath && fs.existsSync(oldPath)) {
      try {
        fs.unlinkSync(oldPath); // ✅ no callback needed
        console.log("Old invoice deleted:", oldPath);

        const folderToDelete = path.dirname(oldPath);
        const isEmpty = fs.readdirSync(folderToDelete).length === 0;
        if (isEmpty) {
          fs.rmdirSync(folderToDelete);
          console.log("Empty folder deleted:", folderToDelete);
        }
      } catch (err) {
        console.error("Error deleting invoice or folder:", err);
      }
    }
    // end
    console.log("Writing PDF to:", filePath);

    // ✅ Step 4: Generate the PDF
    await generateBookingReceiptInvoice(invoiceData, filePath);
    await prisma.bookingReceipt.update({
      where: { id: parseInt(bookingReceiptId, 10) },
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
  createGroupClientBookingReceipt,
  getGroupClientBookingReceiptById,
  updateGroupClientBookingReceipt,
  deleteGroupClientBookingReceipt,
  getAllBookingReceiptsByGroupClientBookingId,
  generateGroupClientInvoice,
};
