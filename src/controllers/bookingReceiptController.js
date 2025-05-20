const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const dayjs = require("dayjs");
const parseDate = (value) => {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  return dayjs(value).isValid() ? new Date(value) : undefined;
};
const generateBookingReceiptNumber = require("../utils/generateBookingReceiptNumber");
// Create a new booking receipt
const createBookingReceipt = async (req, res) => {
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
  const { id } = req.params;

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
    isGst,
  } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const receiptNumber = await generateBookingReceiptNumber(
        tx,
        req.user.agencyId
      );

      const newReceipt = await tx.bookingReceipt.create({
        data: {
          agencyId: parseInt(req.user.agencyId),
          bookingId: parseInt(id),
          receiptNumber: receiptNumber,
          receiptDate: parseDate(receiptDate),
          paymentMode,
          amount: amount ? parseFloat(amount) : null,
          bankId: bankId ? parseInt(bankId) : null,
          chequeDate: chequeDate ? parseDate(chequeDate) : null,
          chequeNumber,
          utrNumber,
          neftImpfNumber,
          isGst: isGst ? parseInt(isGst) : null,
          cgstPercent: cgstPercent ? parseFloat(cgstPercent) : null,
          cgstAmount: cgstAmount ? parseFloat(cgstAmount) : null,
          sgstPercent: sgstPercent ? parseFloat(sgstPercent) : null,
          sgstAmount: sgstAmount ? parseFloat(sgstAmount) : null,
          igstPercent: igstPercent ? parseFloat(igstPercent) : null,
          igstAmount: igstAmount ? parseFloat(igstAmount) : null,
          totalAmount: parseFloat(totalAmount),
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
const getBookingReceiptById = async (req, res) => {
  const { id } = req.params;
  try {
    const receipt = await prisma.bookingReceipt.findUnique({
      where: { id: parseInt(id, 10) },
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
const updateBookingReceipt = async (req, res) => {
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
  const { id } = req.params;

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
      where: { id: parseInt(id, 10) },
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
const deleteBookingReceipt = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.bookingReceipt.delete({
      where: { id: parseInt(id, 10) },
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
const getAllBookingReceiptsByBookingId = async (req, res) => {
  const { id: bookingId } = req.params;
  try {
    const receipts = await prisma.bookingReceipt.findMany({
      where: { bookingId: parseInt(bookingId, 10) },
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

module.exports = {
  createBookingReceipt,
  getBookingReceiptById,
  updateBookingReceipt,
  deleteBookingReceipt,
  getAllBookingReceiptsByBookingId,
};
