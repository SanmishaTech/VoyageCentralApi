const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const dayjs = require("dayjs");
const { buildTourProTotals } = require("../utils/bookingCostingMath");
const { numberToWords } = require("../utils/numberToWords");
const {
  regenerateBookingDocuments,
} = require("../utils/bookingDocumentService");
const path = require("path");
const fs = require("fs");

const parseDate = (value) => {
  if (typeof value !== "string" || value.trim() === "") return null;
  return dayjs(value).isValid() ? new Date(value) : null;
};

const toDecimal = (value) => {
  if (value === null || value === undefined || value === "") return null;
  return new Prisma.Decimal(value);
};

const bookingInclude = {
  journeyBookings: true,
  hotelBookings: true,
  vehicleBookings: true,
  serviceBookings: true,
  bookingCosting: {
    include: {
      agent: { select: { id: true, agentName: true } },
      transferBank: { select: { id: true, bankName: true } },
      ofBank: { select: { id: true, bankName: true } },
    },
  },
};

const getBookingCosting = async (req, res) => {
  const bookingId = parseInt(req.params.bookingId, 10);

  try {
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: "User does not belong to any Agency" });
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        agencyId: parseInt(req.user.agencyId, 10),
      },
      include: bookingInclude,
    });

    if (!booking) {
      return res.status(404).json({ errors: { message: "Booking not found" } });
    }

    const costing = booking.bookingCosting;
    // Auto-fill service charges from line bookings (ignore saved SC overrides on read)
    const totals = buildTourProTotals(booking, {
      ...(costing || {}),
      paidAmount: costing?.paidAmount,
      hotelServiceCharge: undefined,
      vehicleServiceCharge: undefined,
      otherServicesServiceCharge: undefined,
      journeyServiceCharge: undefined,
    });

    const receiptAgg = await prisma.bookingReceipt.aggregate({
      where: {
        bookingId,
        agencyId: parseInt(req.user.agencyId, 10),
      },
      _sum: { totalAmount: true },
    });
    const clientPaidAmount = Number(receiptAgg._sum.totalAmount || 0);
    const clientOutstanding = Math.max(
      0,
      Number(totals.payableAmount || 0) - clientPaidAmount
    );

    res.status(200).json({
      bookingId,
      isPackage: booking.isPackage,
      isJourney: booking.isJourney,
      bookingType: booking.bookingType,
      taxInvoiceNumber: booking.taxInvoiceNumber,
      taxInvoicePath: booking.taxInvoicePath,
      quotationPath: booking.quotationPath,
      estimatePath: booking.estimatePath,
      costing: costing || null,
      totals,
      clientPaidAmount,
      clientOutstanding,
    });
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch booking costing",
        details: error.message,
      },
    });
  }
};

const upsertBookingCosting = async (req, res) => {
  const schema = z.object({
    agentId: z.union([z.string(), z.number(), z.null()]).optional(),
    isPaid: z.boolean().optional(),
    paymentMode: z.string().optional().nullable(),
    paidAmount: z.union([z.string(), z.number(), z.null()]).optional(),
    transferBankId: z.union([z.string(), z.number(), z.null()]).optional(),
    accountNo: z.string().optional().nullable(),
    chequeNumber: z.string().optional().nullable(),
    chequeDate: z.string().optional().nullable(),
    ofBankId: z.union([z.string(), z.number(), z.null()]).optional(),
    inFavourOf: z.string().optional().nullable(),
    billDescription: z.string().optional().nullable(),
    inputCommission: z.union([z.string(), z.number(), z.null()]).optional(),
    commissionAmount: z.union([z.string(), z.number(), z.null()]).optional(),
    serviceChargeOnCost: z.union([z.string(), z.number(), z.null()]).optional(),
    serviceChargeOnPackage: z
      .union([z.string(), z.number(), z.null()])
      .optional(),
    // legacy aliases accepted
    packageCost: z.union([z.string(), z.number(), z.null()]).optional(),
    packageServiceCharge: z
      .union([z.string(), z.number(), z.null()])
      .optional(),
    hotelServiceCharge: z.union([z.string(), z.number(), z.null()]).optional(),
    vehicleServiceCharge: z
      .union([z.string(), z.number(), z.null()])
      .optional(),
    otherServicesServiceCharge: z
      .union([z.string(), z.number(), z.null()])
      .optional(),
    journeyServiceCharge: z.union([z.string(), z.number(), z.null()]).optional(),
    discount: z.union([z.string(), z.number(), z.null()]).optional(),
    gstOn: z.string().optional().nullable(),
    gstPercent: z.union([z.string(), z.number(), z.null()]).optional(),
    gstAmount: z.union([z.string(), z.number(), z.null()]).optional(),
    inclusiveServiceTax: z.boolean().optional(),
  });

  const bookingId = parseInt(req.params.bookingId, 10);
  await validateRequest(schema, req.body, res);

  try {
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: "User does not belong to any Agency" });
    }

    const agencyId = parseInt(req.user.agencyId, 10);

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, agencyId },
        include: {
          journeyBookings: true,
          hotelBookings: true,
          vehicleBookings: true,
          serviceBookings: true,
        },
      });

      if (!booking) {
        const err = new Error("Booking not found");
        err.status = 404;
        throw err;
      }

      const body = req.body;
      const totals = buildTourProTotals(booking, {
        ...body,
        serviceChargeOnCost:
          body.serviceChargeOnCost != null
            ? body.serviceChargeOnCost
            : body.packageCost,
        serviceChargeOnPackage:
          body.serviceChargeOnPackage != null
            ? body.serviceChargeOnPackage
            : 0,
        gstPercent: 0,
        gstAmount: 0,
        gstOn: null,
        inclusiveServiceTax: false,
        inputCommission: 0,
      });

      const amountInWords = numberToWords(totals.payableAmount);

      const data = {
        agentId: body.agentId ? parseInt(body.agentId, 10) : null,
        isPaid: Boolean(body.isPaid),
        paymentMode: body.paymentMode || null,
        paidAmount: toDecimal(body.paidAmount),
        transferBankId: body.transferBankId
          ? parseInt(body.transferBankId, 10)
          : null,
        accountNo: body.accountNo || null,
        chequeNumber: body.chequeNumber || null,
        chequeDate: body.chequeDate ? parseDate(body.chequeDate) : null,
        ofBankId: body.ofBankId ? parseInt(body.ofBankId, 10) : null,
        inFavourOf: body.inFavourOf || null,
        billDescription: body.billDescription || null,
        inputCommission: toDecimal(0),
        commissionAmount: toDecimal(0),
        serviceAmt: toDecimal(totals.serviceAmt),
        packageJourney: toDecimal(totals.packageJourney),
        beforePackageCost: toDecimal(totals.beforePackageCost),
        beforePackageServiceCharge: toDecimal(
          totals.beforePackageServiceCharge
        ),
        beforePackageTotalCost: toDecimal(totals.beforePackageTotalCost),
        serviceChargeOnCost: toDecimal(totals.serviceChargeOnCost),
        serviceChargeOnPackage: toDecimal(totals.serviceChargeOnPackage),
        totalServiceCharge: toDecimal(totals.totalServiceCharge),
        journeyServiceCharge: toDecimal(totals.journeyServiceCharge),
        hotelServiceCharge: toDecimal(totals.hotelServiceCharge),
        vehicleServiceCharge: toDecimal(totals.vehicleServiceCharge),
        otherServicesServiceCharge: toDecimal(
          totals.otherServicesServiceCharge
        ),
        packageCost: toDecimal(totals.packageCost),
        packageServiceCharge: toDecimal(totals.packageServiceCharge),
        packageTotalCost: toDecimal(totals.packageTotalCost),
        discount: toDecimal(totals.discount),
        gstOn: null,
        gstPercent: toDecimal(0),
        gstAmount: toDecimal(0),
        inclusiveServiceTax: false,
        totalPackageCost: toDecimal(totals.totalPackageCost),
        payableAmount: toDecimal(totals.payableAmount),
        amountInWords,
      };

      const costing = await tx.bookingCosting.upsert({
        where: { bookingId },
        create: { bookingId, ...data },
        update: data,
        include: {
          agent: { select: { id: true, agentName: true } },
          transferBank: { select: { id: true, bankName: true } },
          ofBank: { select: { id: true, bankName: true } },
        },
      });

      let docs = null;
      if (booking.bookingType === "Confirm") {
        docs = await regenerateBookingDocuments(tx, bookingId, agencyId);
      }

      return { costing, totals: { ...totals, amountInWords }, docs };
    });

    res.status(200).json({
      bookingId,
      costing: result.costing,
      totals: result.totals,
      documents: result.docs,
    });
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ errors: { message: error.message } });
    }
    res.status(500).json({
      errors: {
        message: "Failed to save booking costing",
        details: error.message,
      },
    });
  }
};

const downloadTaxInvoice = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    const agencyId = parseInt(req.user.agencyId, 10);

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, agencyId },
    });
    if (!booking) {
      return res.status(404).json({ errors: { message: "Booking not found" } });
    }

    // Ensure PDF exists / regenerate
    await prisma.$transaction(async (tx) => {
      await regenerateBookingDocuments(tx, bookingId, agencyId);
    });

    const fresh = await prisma.booking.findFirst({
      where: { id: bookingId, agencyId },
    });
    if (!fresh?.taxInvoicePath) {
      return res
        .status(404)
        .json({ errors: { message: "Tax invoice not available" } });
    }

    const fullPath = path.join(__dirname, "..", "..", fresh.taxInvoicePath);
    if (!fs.existsSync(fullPath)) {
      return res
        .status(404)
        .json({ errors: { message: "Tax invoice file missing" } });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="TaxInvoice-${fresh.taxInvoiceNumber || bookingId}.pdf"`
    );
    return res.sendFile(path.resolve(fullPath));
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to open tax invoice",
        details: error.message,
      },
    });
  }
};

const downloadQuotation = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    const agencyId = parseInt(req.user.agencyId, 10);

    await prisma.$transaction(async (tx) => {
      await regenerateBookingDocuments(tx, bookingId, agencyId);
    });

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, agencyId },
    });
    if (!booking?.quotationPath) {
      return res
        .status(404)
        .json({ errors: { message: "Quotation not available" } });
    }
    const fullPath = path.join(__dirname, "..", "..", booking.quotationPath);
    if (!fs.existsSync(fullPath)) {
      return res
        .status(404)
        .json({ errors: { message: "Quotation file missing" } });
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="Quotation-${booking.bookingNumber || bookingId}.pdf"`
    );
    return res.sendFile(path.resolve(fullPath));
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to open quotation",
        details: error.message,
      },
    });
  }
};

const downloadPackageSummary = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    const agencyId = parseInt(req.user.agencyId, 10);

    await prisma.$transaction(async (tx) => {
      await regenerateBookingDocuments(tx, bookingId, agencyId);
    });

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, agencyId },
    });
    if (!booking?.packageSummaryPath) {
      return res
        .status(404)
        .json({ errors: { message: "Package summary not available" } });
    }
    const fullPath = path.join(
      __dirname,
      "..",
      "..",
      booking.packageSummaryPath
    );
    if (!fs.existsSync(fullPath)) {
      return res
        .status(404)
        .json({ errors: { message: "Package summary file missing" } });
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="PackageSummary-${booking.bookingNumber || bookingId}.pdf"`
    );
    return res.sendFile(path.resolve(fullPath));
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to open package summary",
        details: error.message,
      },
    });
  }
};

module.exports = {
  getBookingCosting,
  upsertBookingCosting,
  downloadTaxInvoice,
  downloadQuotation,
  downloadPackageSummary,
};
