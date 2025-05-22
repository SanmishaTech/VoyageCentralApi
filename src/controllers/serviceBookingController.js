const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors");
const dayjs = require("dayjs");
const parseDate = (value) => {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  return dayjs(value).isValid() ? new Date(value) : undefined;
};
// Create Service Booking
const createServiceBooking = async (req, res, next) => {
  const schema = z.object({
    description: z.string().min(1, "Description is required."),
  });

  const { id: bookingId } = req.params;
  const validationErrors = await validateRequest(schema, req.body, res);

  try {
    const {
      description,
      cost,
      isPaid,
      agentId,
      paymentMode,
      bankId,
      serviceId,
      paymentDate,
      paidAmount,
      chequeDate,
      chequeNumber,
      utrNumber,
      neftImpfNumber,
    } = req.body;

    const newServiceBooking = await prisma.serviceBooking.create({
      data: {
        bookingId: parseInt(bookingId),
        description,
        cost: cost ? new Prisma.Decimal(cost) : null,
        isPaid,
        agentId: agentId ? parseInt(agentId) : null,
        paymentMode: paymentMode || null,
        bankId: bankId ? parseInt(bankId) : null,
        serviceId: serviceId ? parseInt(serviceId) : null,
        paymentDate: paymentDate ? parseDate(paymentDate) : null,
        paidAmount: paidAmount ? new Prisma.Decimal(paidAmount) : null,
        chequeDate: chequeDate ? parseDate(chequeDate) : null,
        chequeNumber: chequeNumber || null,
        utrNumber: utrNumber || null,
        neftImpfNumber: neftImpfNumber || null,
      },
    });

    res.status(201).json(newServiceBooking);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to create service booking",
        details: error.message,
      },
    });
  }
};

// Get Service Booking by ID
const getServiceBookingById = async (req, res) => {
  const { id } = req.params;

  try {
    const serviceBooking = await prisma.serviceBooking.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!serviceBooking) {
      return res
        .status(404)
        .json({ errors: { message: "Service booking not found" } });
    }

    res.status(200).json(serviceBooking);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch service booking",
        details: error.message,
      },
    });
  }
};

// Update Service Booking
const updateServiceBooking = async (req, res) => {
  const schema = z.object({
    description: z.string().min(1, "Description is required."),
  });

  const validationErrors = await validateRequest(schema, req.body, res);

  const { id } = req.params;

  try {
    const {
      description,
      cost,
      isPaid,
      agentId,
      paymentMode,
      bankId,
      serviceId,
      paymentDate,
      paidAmount,
      chequeDate,
      chequeNumber,
      utrNumber,
      neftImpfNumber,
    } = req.body;

    const updatedServiceBooking = await prisma.serviceBooking.update({
      where: { id: parseInt(id, 10) },
      data: {
        description,
        cost: cost ? new Prisma.Decimal(cost) : null,
        isPaid,
        agentId: agentId ? parseInt(agentId) : null,
        paymentMode: paymentMode || null,
        bankId: bankId ? parseInt(bankId) : null,
        serviceId: serviceId ? parseInt(serviceId) : null,
        paymentDate: paymentDate ? parseDate(paymentDate) : null,
        paidAmount: paidAmount ? new Prisma.Decimal(paidAmount) : null,
        chequeDate: chequeDate ? parseDate(chequeDate) : null,
        chequeNumber: chequeNumber || null,
        utrNumber: utrNumber || null,
        neftImpfNumber: neftImpfNumber || null,
      },
    });

    res.status(200).json(updatedServiceBooking);
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ errors: { message: "Service booking not found" } });
    }
    res.status(500).json({
      errors: {
        message: "Failed to update service booking",
        details: error.message,
      },
    });
  }
};

// Delete Service Booking
const deleteServiceBooking = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.serviceBooking.delete({
      where: { id: parseInt(id, 10) },
    });

    res.status(204).send();
  } catch (error) {
    if (
      error.code === "P2003" ||
      error.message.includes("Foreign key constraint failed")
    ) {
      return res.status(409).json({
        errors: {
          message:
            "Cannot delete this Service Booking because it is referenced in related data. Please remove the related references before deleting.",
        },
      });
    }
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ errors: { message: "Service booking not found" } });
    }
    res.status(500).json({
      errors: {
        message: "Failed to delete service booking",
        details: error.message,
      },
    });
  }
};

// Get All Service Bookings by Booking ID
const getAllServiceBookingsByBookingId = async (req, res) => {
  const { id: bookingId } = req.params;

  try {
    const serviceBookings = await prisma.serviceBooking.findMany({
      where: { bookingId: parseInt(bookingId) },
    });

    res.status(200).json({ serviceBookings });
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch service bookings",
        details: error.message,
      },
    });
  }
};

module.exports = {
  createServiceBooking,
  getServiceBookingById,
  updateServiceBooking,
  deleteServiceBooking,
  getAllServiceBookingsByBookingId,
};
