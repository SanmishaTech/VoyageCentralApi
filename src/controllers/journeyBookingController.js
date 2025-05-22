const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors"); // For consistent error handling
const dayjs = require("dayjs");
const parseDate = require("../utils/parseDate");

const createJourneyBooking = async (req, res, next) => {
  const schema = z
    .object({
      mode: z.string().min(1, "Mode of transport is required."),
      fromPlace: z.string().min(1, "From place is required."),
      toPlace: z.string().min(1, "To place is required."),
      journeyBookingDate: z.string().min(1, "booking date is required."),
      fromDepartureDate: z.string().min(1, "booking date is required."),
      toArrivalDate: z.string().min(1, "booking date is required."),
      foodType: z.string().optional(),
      billDescription: z.string().optional(),
      trainName: z.string().optional(),
      trainNumber: z.string().optional(),
      trainClass: z.string().optional(),
      flightClass: z.string().optional(),
      pnrNumber: z.string().optional(),
      busName: z.string().optional(),
      flightNumber: z.string().optional(),
      airlineId: z.number().nullable().optional(),
      vehicleId: z.number().nullable().optional(),
    })
    .superRefine((data, ctx) => {
      // If the mode is "Train", ensure trainName and trainNumber are provided
      if (data.mode === "Train") {
        if (!data.trainName) {
          ctx.addIssue({
            path: ["trainName"], // Path to the trainName field
            message: "Train Name is required when mode is 'Train'",
            code: z.ZodIssueCode.custom,
          });
        }

        if (!data.trainNumber) {
          ctx.addIssue({
            path: ["trainNumber"], // Path to the trainNumber field
            message: "Train Number is required when mode is 'Train'",
            code: z.ZodIssueCode.custom,
          });
        }

        if (!data.pnrNumber) {
          ctx.addIssue({
            path: ["pnrNumber"], // Path to the trainNumber field
            message: "PNR Number is required when mode is 'Train'",
            code: z.ZodIssueCode.custom,
          });
        }

        if (!data.trainClass) {
          ctx.addIssue({
            path: ["trainClass"], // Path to the trainNumber field
            message: "Class is required when mode is 'Train'",
            code: z.ZodIssueCode.custom,
          });
        }
      }

      // flight
      if (data.mode === "Flight") {
        if (!data.airlineId) {
          ctx.addIssue({
            path: ["airlineId"], // Path to the trainName field
            message: "Flight Name is required when mode is 'Flight'",
            code: z.ZodIssueCode.custom,
          });
        }

        if (!data.flightNumber) {
          ctx.addIssue({
            path: ["flightNumber"], // Path to the trainNumber field
            message: "Flight Number is required when mode is 'Flight'",
            code: z.ZodIssueCode.custom,
          });
        }

        if (!data.pnrNumber) {
          ctx.addIssue({
            path: ["pnrNumber"], // Path to the trainNumber field
            message: "PNR Number is required when mode is 'Flight'",
            code: z.ZodIssueCode.custom,
          });
        }

        if (!data.flightClass) {
          ctx.addIssue({
            path: ["flightClass"], // Path to the trainNumber field
            message: "Class is required when mode is 'Flight'",
            code: z.ZodIssueCode.custom,
          });
        }
      }
      // flight end
      // bus start
      if (data.mode === "Bus") {
        if (!data.busName) {
          ctx.addIssue({
            path: ["busName"], // Path to the trainName field
            message: "Bus Name is required when mode is 'Bus'",
            code: z.ZodIssueCode.custom,
          });
        }
      }
      // bus end
      // vehicle start
      if (data.mode === "Car") {
        if (!data.vehicleId) {
          ctx.addIssue({
            path: ["vehicleId"], // Path to the trainName field
            message: "Car Name is required when mode is 'Car'",
            code: z.ZodIssueCode.custom,
          });
        }
      }
      // vehicle end
    });

  const { id } = req.params;
  const validationErrors = await validateRequest(schema, req.body, res);

  // const parseDate = (value) => {
  //   if (typeof value !== "string" || value.trim() === "") return undefined;
  //   return dayjs(value).isValid() ? new Date(value) : undefined;
  // };

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
      trainClass,
      flightClass,
      pnrNumber,
      trainNumber,
      busName,
      flightNumber,
      airlineId,
      vehicleId,
      amount,
    } = req.body;

    let classVal = null;
    if (mode === "Train") {
      classVal = trainClass;
    } else if (mode === "Flight") {
      classVal = flightClass;
    }

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
        class: classVal,
        pnrNumber: pnrNumber || null,
        trainNumber: trainNumber || null,
        busName: busName || null,
        flightNumber: flightNumber || null,
        airlineId: airlineId ? parseInt(airlineId) : null,
        vehicleId: vehicleId ? parseInt(vehicleId) : null,
        amount: amount ? new Prisma.Decimal(amount) : null,
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
  // const schema = z.object({
  //   mode: z.string().min(1, "Mode of transport is required."),
  // });
  const schema = z
    .object({
      mode: z.string().min(1, "Mode of transport is required."),
      fromPlace: z.string().min(1, "From place is required."),
      toPlace: z.string().min(1, "To place is required."),
      journeyBookingDate: z.string().min(1, "booking date is required."),
      fromDepartureDate: z.string().min(1, "booking date is required."),
      toArrivalDate: z.string().min(1, "booking date is required."),
      foodType: z.string().optional(),
      billDescription: z.string().optional(),
      trainName: z.string().optional(),
      trainNumber: z.string().optional(),
      trainClass: z.string().optional(),
      flightClass: z.string().optional(),
      pnrNumber: z.string().optional(),
      busName: z.string().optional(),
      flightNumber: z.string().optional(),
      airlineId: z.number().nullable().optional(),
      vehicleId: z.number().nullable().optional(),
    })
    .superRefine((data, ctx) => {
      // If the mode is "Train", ensure trainName and trainNumber are provided
      if (data.mode === "Train") {
        if (!data.trainName) {
          ctx.addIssue({
            path: ["trainName"], // Path to the trainName field
            message: "Train Name is required when mode is 'Train'",
            code: z.ZodIssueCode.custom,
          });
        }

        if (!data.trainNumber) {
          ctx.addIssue({
            path: ["trainNumber"], // Path to the trainNumber field
            message: "Train Number is required when mode is 'Train'",
            code: z.ZodIssueCode.custom,
          });
        }

        if (!data.pnrNumber) {
          ctx.addIssue({
            path: ["pnrNumber"], // Path to the trainNumber field
            message: "PNR Number is required when mode is 'Train'",
            code: z.ZodIssueCode.custom,
          });
        }

        if (!data.trainClass) {
          ctx.addIssue({
            path: ["trainClass"], // Path to the trainNumber field
            message: "Class is required when mode is 'Train'",
            code: z.ZodIssueCode.custom,
          });
        }
      }

      // flight
      if (data.mode === "Flight") {
        if (!data.airlineId) {
          ctx.addIssue({
            path: ["airlineId"], // Path to the trainName field
            message: "Flight Name is required when mode is 'Flight'",
            code: z.ZodIssueCode.custom,
          });
        }

        if (!data.flightNumber) {
          ctx.addIssue({
            path: ["flightNumber"], // Path to the trainNumber field
            message: "Flight Number is required when mode is 'Flight'",
            code: z.ZodIssueCode.custom,
          });
        }

        if (!data.pnrNumber) {
          ctx.addIssue({
            path: ["pnrNumber"], // Path to the trainNumber field
            message: "PNR Number is required when mode is 'Flight'",
            code: z.ZodIssueCode.custom,
          });
        }

        if (!data.flightClass) {
          ctx.addIssue({
            path: ["flightClass"], // Path to the trainNumber field
            message: "Class is required when mode is 'Flight'",
            code: z.ZodIssueCode.custom,
          });
        }
      }
      // flight end
      // bus start
      if (data.mode === "Bus") {
        if (!data.busName) {
          ctx.addIssue({
            path: ["busName"], // Path to the trainName field
            message: "Bus Name is required when mode is 'Bus'",
            code: z.ZodIssueCode.custom,
          });
        }
      }
      // bus end

      // vehicle start
      if (data.mode === "Car") {
        if (!data.vehicleId) {
          ctx.addIssue({
            path: ["vehicleId"], // Path to the trainName field
            message: "Car Name is required when mode is 'Car'",
            code: z.ZodIssueCode.custom,
          });
        }
      }
      // vehicle end
    });

  // const parseDate = (value) => {
  //   if (typeof value !== "string" || value.trim() === "") return undefined;
  //   return dayjs(value).isValid() ? new Date(value) : undefined;
  // };
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
      trainClass,
      flightClass,
      pnrNumber,
      trainNumber,
      busName,
      flightNumber,
      airlineId,
      vehicleId,
      amount,
    } = req.body;

    let classVal = null;
    if (mode === "Train") {
      classVal = trainClass;
    } else if (mode === "Flight") {
      classVal = flightClass;
    }

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
        class: classVal,
        pnrNumber: pnrNumber || null,
        trainNumber: trainNumber || null,
        busName: busName || null,
        flightNumber: flightNumber || null,
        airlineId: airlineId ? parseInt(airlineId) : null,
        vehicleId: vehicleId ? parseInt(vehicleId) : null,
        amount: amount ? new Prisma.Decimal(amount) : null,
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
    if (
      error.code === "P2003" ||
      error.message.includes("Foreign key constraint failed")
    ) {
      return res.status(409).json({
        errors: {
          message:
            "Cannot delete this Journey Booking because it is referenced in related data. Please remove the related references before deleting.",
        },
      });
    }
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

    res.status(200).json({ journeyBookings });
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
