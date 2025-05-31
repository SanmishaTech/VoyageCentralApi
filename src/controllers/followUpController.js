const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors"); // For consistent error handling
const dayjs = require("dayjs");

// Create a new follow-up
const createFollowUp = async (req, res, next) => {
  const schema = z.object({
    followUpDate: z.string().min(1, "Follow-up date is required."),
    nextFollowUpDate: z.string().min(1, "Follow-up date is required."),
    remarks: z
      .string()
      .min(1, "remarks field is required.")
      .max(2000, "remarks must not exceed 2000 characters"),
  });
  const { id } = req.params;
  const validationErrors = await validateRequest(schema, req.body, res);

  try {
    const { followUpDate, nextFollowUpDate, remarks } = req.body;
    const parseDate = (value) => {
      if (typeof value !== "string" || value.trim() === "") return undefined;
      return dayjs(value).isValid() ? new Date(value) : undefined;
    };
    const result = await prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.booking.update({
        where: { id: parseInt(id) },
        data: { remarks: remarks, followUpDate: parseDate(nextFollowUpDate) },
      });

      const newFollowUp = await tx.followUp.create({
        data: {
          bookingId: parseInt(id),
          userId: parseInt(req.user.id),
          followUpDate: parseDate(followUpDate),
          nextFollowUpDate: parseDate(nextFollowUpDate),
          remarks,
        },
      });

      return {
        updatedBooking: updatedBooking,
      };
    });

    res.status(201).json(result.updatedBooking);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to create follow-up",
        details: error.message,
      },
    });
  }
};

const createFollowUpByGroupBookingId = async (req, res, next) => {
  const schema = z.object({
    followUpDate: z.string().min(1, "Follow-up date is required."),
    nextFollowUpDate: z.string().min(1, "Follow-up date is required."),
    remarks: z
      .string()
      .min(1, "remarks field is required.")
      .max(2000, "remarks must not exceed 2000 characters"),
  });
  const { groupBookingId } = req.params;
  const validationErrors = await validateRequest(schema, req.body, res);

  try {
    const { followUpDate, nextFollowUpDate, remarks } = req.body;
    const parseDate = (value) => {
      if (typeof value !== "string" || value.trim() === "") return undefined;
      return dayjs(value).isValid() ? new Date(value) : undefined;
    };
    const result = await prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.groupBooking.update({
        where: { id: parseInt(groupBookingId) },
        data: { remarks: remarks, followUpDate: parseDate(nextFollowUpDate) },
      });

      const newFollowUp = await tx.followUp.create({
        data: {
          groupBookingId: parseInt(groupBookingId),
          userId: parseInt(req.user.id),
          followUpDate: parseDate(followUpDate),
          nextFollowUpDate: parseDate(nextFollowUpDate),
          remarks,
        },
      });

      return {
        updatedBooking: updatedBooking,
      };
    });

    res.status(201).json(result.updatedBooking);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to create follow-up",
        details: error.message,
      },
    });
  }
};

// Get all follow-ups without pagination
const getFollowUpsById = async (req, res, next) => {
  const { id } = req.params;

  try {
    // Fetch follow-ups with pagination and sorting
    const followUps = await prisma.followUp.findMany({
      where: { bookingId: parseInt(id) },
    });

    res.status(200).json(followUps);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch follow-ups",
        details: error.message,
      },
    });
  }
};

const getFollowUpsByGroupBookingId = async (req, res, next) => {
  const { groupBookingId } = req.params;

  try {
    // Fetch follow-ups with pagination and sorting
    const followUps = await prisma.followUp.findMany({
      where: { groupBookingId: parseInt(groupBookingId) },
    });

    res.status(200).json(followUps);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch follow-ups",
        details: error.message,
      },
    });
  }
};

module.exports = {
  createFollowUp,
  getFollowUpsById,
  getFollowUpsByGroupBookingId,
  createFollowUpByGroupBookingId,
};
