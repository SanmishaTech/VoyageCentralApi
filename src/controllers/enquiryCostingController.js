const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const { toNumber } = require("../utils/lineCostingMath");
const {
  regenerateEstimateDocument,
} = require("../utils/bookingDocumentService");
const path = require("path");
const fs = require("fs");

const getEnquiryCosting = async (req, res) => {
  const bookingId = parseInt(req.params.bookingId, 10);
  try {
    const agencyId = parseInt(req.user.agencyId, 10);
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, agencyId },
      include: { enquiryCostings: { orderBy: { id: "asc" } } },
    });
    if (!booking) {
      return res.status(404).json({ errors: { message: "Booking not found" } });
    }
    const totalPackageCost = (booking.enquiryCostings || []).reduce(
      (s, l) => s + toNumber(l.cost),
      0
    );
    res.status(200).json({
      bookingId,
      costingNote: booking.costingNote,
      estimatePath: booking.estimatePath,
      lines: booking.enquiryCostings,
      totalPackageCost,
    });
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch enquiry costing",
        details: error.message,
      },
    });
  }
};

const upsertEnquiryCosting = async (req, res) => {
  const schema = z.object({
    costingNote: z.string().optional().nullable(),
    lines: z
      .array(
        z.object({
          fairName: z.string().optional().nullable(),
          description: z.string().optional().nullable(),
          cost: z.union([z.string(), z.number(), z.null()]).optional(),
        })
      )
      .optional(),
  });

  const bookingId = parseInt(req.params.bookingId, 10);
  await validateRequest(schema, req.body, res);

  try {
    const agencyId = parseInt(req.user.agencyId, 10);
    const { costingNote, lines = [] } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, agencyId },
      });
      if (!booking) {
        const err = new Error("Booking not found");
        err.status = 404;
        throw err;
      }

      await tx.enquiryCosting.deleteMany({ where: { bookingId } });

      if (lines.length > 0) {
        await tx.enquiryCosting.createMany({
          data: lines.map((line) => ({
            bookingId,
            fairName: line.fairName || null,
            description: line.description || null,
            cost:
              line.cost === null || line.cost === undefined || line.cost === ""
                ? null
                : new Prisma.Decimal(line.cost),
          })),
        });
      }

      await tx.booking.update({
        where: { id: bookingId },
        data: { costingNote: costingNote || null },
      });

      const docs = await regenerateEstimateDocument(tx, bookingId, agencyId);
      const savedLines = await tx.enquiryCosting.findMany({
        where: { bookingId },
        orderBy: { id: "asc" },
      });

      return { docs, lines: savedLines };
    });

    const totalPackageCost = result.lines.reduce(
      (s, l) => s + toNumber(l.cost),
      0
    );

    res.status(200).json({
      bookingId,
      costingNote: costingNote || null,
      lines: result.lines,
      totalPackageCost,
      estimatePath: result.docs?.estimatePath || null,
    });
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ errors: { message: error.message } });
    }
    res.status(500).json({
      errors: {
        message: "Failed to save enquiry costing",
        details: error.message,
      },
    });
  }
};

const downloadEstimate = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    const agencyId = parseInt(req.user.agencyId, 10);

    await prisma.$transaction(async (tx) => {
      await regenerateEstimateDocument(tx, bookingId, agencyId);
    });

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, agencyId },
    });
    if (!booking?.estimatePath) {
      return res
        .status(404)
        .json({ errors: { message: "Estimate not available" } });
    }
    const fullPath = path.join(__dirname, "..", "..", booking.estimatePath);
    if (!fs.existsSync(fullPath)) {
      return res
        .status(404)
        .json({ errors: { message: "Estimate file missing" } });
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="Estimate-${booking.bookingNumber || bookingId}.pdf"`
    );
    return res.sendFile(require("path").resolve(fullPath));
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to download estimate",
        details: error.message,
      },
    });
  }
};

module.exports = {
  getEnquiryCosting,
  upsertEnquiryCosting,
  downloadEstimate,
};
