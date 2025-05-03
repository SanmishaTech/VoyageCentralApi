const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors"); // For consistent error handling
const dayjs = require("dayjs");

const createJourneyBooking = async (req, res, next) => {
  const schema = z.object({
    mode: z.string().min(1, "Mode of transport is required."),
  });
  const { id } = req.params;
  const validationErrors = await validateRequest(schema, req.body, res);

  const parseDate = (value) => {
    if (typeof value !== "string" || value.trim() === "") return undefined;
    return dayjs(value).isValid() ? new Date(value) : undefined;
  };

  try {
    const {
      mode,
      fromPlace,
      toPlace,
      journeyBookingDate,
      fromDepartureDate,
      toArrivalDate,
      foodType,
      billDescription,
      trainName,
      class: travelClass,
      pnrNumber,
      trainNumber,
      busName,
      flightNumber,
      airlineId,
    } = req.body;

    const newJourneyBooking = await prisma.journeyBooking.create({
      data: {
        bookingId: parseInt(id),
        mode,
        fromPlace,
        toPlace,
        journeyBookingDate: parseDate(journeyBookingDate),
        fromDepartureDate: parseDate(fromDepartureDate),
        toArrivalDate: parseDate(toArrivalDate),
        foodType: foodType || null,
        billDescription: billDescription || null,
        trainName: trainName || null,
        class: travelClass || null,
        pnrNumber: pnrNumber || null,
        trainNumber: trainNumber || null,
        busName: busName || null,
        flightNumber: flightNumber || null,
        airlineId: airlineId || null,
      },
    });

    res.status(201).json(newJourneyBooking);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to create journey booking",
        details: error.message,
      },
    });
  }
};

// Get a journey booking by ID
const getJourneyBookingById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const journeyBooking = await prisma.journeyBooking.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!journeyBooking) {
      return res
        .status(404)
        .json({ errors: { message: "Journey booking not found" } });
    }

    res.status(200).json(journeyBooking);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch journey booking",
        details: error.message,
      },
    });
  }
};

// Update a journey booking
const updateJourneyBooking = async (req, res, next) => {
  const schema = z.object({
    mode: z.string().min(1, "Mode of transport is required."),
  });

  const parseDate = (value) => {
    if (typeof value !== "string" || value.trim() === "") return undefined;
    return dayjs(value).isValid() ? new Date(value) : undefined;
  };
  const validationErrors = await validateRequest(schema, req.body, res);

  const { id } = req.params;

  try {
    const {
      mode,
      fromPlace,
      toPlace,
      journeyBookingDate,
      fromDepartureDate,
      toArrivalDate,
      foodType,
      billDescription,
      trainName,
      class: travelClass,
      pnrNumber,
      trainNumber,
      busName,
      flightNumber,
      airlineId,
    } = req.body;

    const updatedJourneyBooking = await prisma.journeyBooking.update({
      where: { id: parseInt(id, 10) },
      data: {
        mode,
        fromPlace,
        toPlace,
        journeyBookingDate: parseDate(journeyBookingDate),
        fromDepartureDate: parseDate(fromDepartureDate),
        toArrivalDate: parseDate(toArrivalDate),
        foodType: foodType || null,
        billDescription: billDescription || null,
        trainName: trainName || null,
        class: travelClass || null,
        pnrNumber: pnrNumber || null,
        trainNumber: trainNumber || null,
        busName: busName || null,
        flightNumber: flightNumber || null,
        airlineId: airlineId || null,
      },
    });

    res.status(200).json(updatedJourneyBooking);
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ errors: { message: "Journey booking not found" } });
    }
    return res.status(500).json({
      errors: {
        message: "Failed to update journey booking",
        details: error.message,
      },
    });
  }
};

// Delete a journey booking
const deleteJourneyBooking = async (req, res, next) => {
  const { id } = req.params;

  try {
    await prisma.journeyBooking.delete({
      where: { id: parseInt(id, 10) },
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ errors: { message: "Journey booking not found" } });
    }
    res.status(500).json({
      errors: {
        message: "Failed to delete journey booking",
        details: error.message,
      },
    });
  }
};

const getAllJourneyBookingsByBookingId = async (req, res, next) => {
  const { id } = req.params;
  try {
    const journeyBookings = await prisma.journeyBooking.findMany({
      where: { bookingId: parseInt(id) },
    });

    res.status(200).json(journeyBookings);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch journey bookings",
        details: error.message,
      },
    });
  }
};

module.exports = {
  createJourneyBooking,
  getJourneyBookingById,
  updateJourneyBooking,
  deleteJourneyBooking,
  getAllJourneyBookingsByBookingId,
};
