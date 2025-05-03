const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const dayjs = require("dayjs");

const parseDate = (value) => {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  return dayjs(value).isValid() ? new Date(value) : undefined;
};

const createHotelBooking = async (req, res) => {
  const schema = z.object({
    partyComingFrom: z.string().min(1, "party coming from field is required."),
  });

  const { id } = req.params;
  const validationErrors = await validateRequest(schema, req.body, res);

  try {
    const {
      hrvNumber,
      partyComingFrom,
      checkInDate,
      checkOutDate,
      nights,
      cityId,
      hotelId,
      plan,
      rooms,
      accommodationId,
      tariffPackage,
      accommodationNote,
      extraBed,
      beds,
      extraBedCost,
      hotelBookingDate,
      bookingConfirmedBy,
      confirmationNumber,
      billingInstructions,
      specialRequirement,
      notes,
      billDescription,
    } = req.body;

    const newHotelBooking = await prisma.hotelBooking.create({
      data: {
        bookingId: parseInt(id),
        hrvNumber,
        partyComingFrom,
        checkInDate: parseDate(checkInDate),
        checkOutDate: parseDate(checkOutDate),
        nights: parseInt(nights) || null,
        cityId: parseInt(cityId),
        hotelId: parseInt(hotelId),
        plan: plan || null,
        rooms: parseInt(rooms) || null,
        accommodationId: parseInt(accommodationId) || null,
        tariffPackage: tariffPackage || null,
        accommodationNote: accommodationNote || null,
        extraBed: extraBed ? true : false,
        beds: parseInt(beds) || null,
        extraBedCost: parseFloat(extraBedCost) || null,
        hotelBookingDate: parseDate(hotelBookingDate),
        bookingConfirmedBy: bookingConfirmedBy || null,
        confirmationNumber: confirmationNumber || null,
        billingInstructions: billingInstructions || null,
        specialRequirement: specialRequirement || null,
        notes: notes || null,
        billDescription: billDescription || null,
      },
    });

    res.status(201).json(newHotelBooking);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to create hotel booking",
        details: error.message,
      },
    });
  }
};

const getHotelBookingById = async (req, res) => {
  const { id } = req.params;

  try {
    const hotelBooking = await prisma.hotelBooking.findUnique({
      where: { id: parseInt(id) },
    });

    if (!hotelBooking) {
      return res
        .status(404)
        .json({ errors: { message: "Hotel booking not found" } });
    }

    res.status(200).json(hotelBooking);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch hotel booking",
        details: error.message,
      },
    });
  }
};

const updateHotelBooking = async (req, res) => {
  const schema = z.object({
    partyComingFrom: z.string().min(1, "party coming from field is required."),
  });

  const validationErrors = await validateRequest(schema, req.body, res);
  const { id } = req.params;

  try {
    const {
      hrvNumber,
      partyComingFrom,
      checkInDate,
      checkOutDate,
      nights,
      cityId,
      hotelId,
      plan,
      rooms,
      accommodationId,
      tariffPackage,
      accommodationNote,
      extraBed,
      beds,
      extraBedCost,
      hotelBookingDate,
      bookingConfirmedBy,
      confirmationNumber,
      billingInstructions,
      specialRequirement,
      notes,
      billDescription,
    } = req.body;

    const updatedHotelBooking = await prisma.hotelBooking.update({
      where: { id: parseInt(id) },
      data: {
        partyComingFrom,
        checkInDate: parseDate(checkInDate),
        checkOutDate: parseDate(checkOutDate),
        nights: parseInt(nights) || null,
        cityId: parseInt(cityId),
        hotelId: parseInt(hotelId),
        plan: plan || null,
        rooms: parseInt(rooms) || null,
        accommodationId: parseInt(accommodationId) || null,
        tariffPackage: tariffPackage || null,
        accommodationNote: accommodationNote || null,
        extraBed: extraBed ? true : false,
        beds: parseInt(beds) || null,
        extraBedCost: parseFloat(extraBedCost) || null,
        hotelBookingDate: parseDate(hotelBookingDate),
        bookingConfirmedBy: bookingConfirmedBy || null,
        confirmationNumber: confirmationNumber || null,
        billingInstructions: billingInstructions || null,
        specialRequirement: specialRequirement || null,
        notes: notes || null,
        billDescription: billDescription || null,
      },
    });

    res.status(200).json(updatedHotelBooking);
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ errors: { message: "Hotel booking not found" } });
    }

    res.status(500).json({
      errors: {
        message: "Failed to update hotel booking",
        details: error.message,
      },
    });
  }
};

const deleteHotelBooking = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.hotelBooking.delete({
      where: { id: parseInt(id) },
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ errors: { message: "Hotel booking not found" } });
    }

    res.status(500).json({
      errors: {
        message: "Failed to delete hotel booking",
        details: error.message,
      },
    });
  }
};

const getAllHotelBookingsByBookingId = async (req, res) => {
  const { id } = req.params;

  try {
    const hotelBookings = await prisma.hotelBooking.findMany({
      where: { bookingId: parseInt(id) },
    });

    res.status(200).json(hotelBookings);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch hotel bookings",
        details: error.message,
      },
    });
  }
};

module.exports = {
  createHotelBooking,
  getHotelBookingById,
  updateHotelBooking,
  deleteHotelBooking,
  getAllHotelBookingsByBookingId,
};
