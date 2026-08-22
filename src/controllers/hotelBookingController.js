const path = require("path");
const fs = require("fs");
const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const dayjs = require("dayjs");
const generateHRVNumber = require("../utils/generateHRVNumber");
const { buildStandardLineCostData } = require("../utils/lineCostingPersist");
const { regenerateBookingDocuments } = require("../utils/bookingDocumentService");
const { buildAgencyDetails } = require("../utils/Invoice/agencyClientDetails");
const generateHotelVoucher = require("../utils/Invoice/generateHotelVoucher");

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
      amount,
      totalAmount,
    } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const hrvNumber = await generateHRVNumber(tx, req.user.agencyId);

      const newHotelBooking = await tx.hotelBooking.create({
        data: {
          bookingId: parseInt(id),
          agencyId: parseInt(req.user.agencyId),
          hrvNumber,
          partyComingFrom,
          checkInDate: parseDate(checkInDate),
          checkOutDate: parseDate(checkOutDate),
          nights: parseInt(nights),
          cityId: parseInt(cityId),
          hotelId: parseInt(hotelId),
          plan: plan || null,
          rooms: parseInt(rooms),
          accommodationId: parseInt(accommodationId),
          tariffPackage: tariffPackage || null,
          accommodationNote: accommodationNote || null,
          extraBed: extraBed ? true : false,
          beds: parseInt(beds),
          // extraBedCost: parseFloat(extraBedCost) || null,
          extraBedCost:
            extraBedCost !== undefined && extraBedCost !== ""
              ? parseFloat(extraBedCost)
              : null,

          hotelBookingDate: parseDate(hotelBookingDate),
          bookingConfirmedBy: bookingConfirmedBy || null,
          confirmationNumber: confirmationNumber || null,
          billingInstructions: billingInstructions || null,
          specialRequirement: specialRequirement || null,
          notes: notes || null,
          billDescription: billDescription || null,
          amount: amount ? new Prisma.Decimal(amount) : null,
          totalAmount: totalAmount ? new Prisma.Decimal(totalAmount) : null,
          ...buildStandardLineCostData(req.body, totalAmount ?? amount),
        },
      });

      if (req.user?.agencyId) {
        await regenerateBookingDocuments(
          tx,
          parseInt(id, 10),
          parseInt(req.user.agencyId, 10)
        );
      }

      return {
        newHotelBooking: newHotelBooking,
      };
    });

    res.status(201).json(result.newHotelBooking);
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
      amount,
      totalAmount,
    } = req.body;

    const updatedHotelBooking = await prisma.hotelBooking.update({
      where: { id: parseInt(id) },
      data: {
        partyComingFrom,
        checkInDate: parseDate(checkInDate),
        checkOutDate: parseDate(checkOutDate),
        nights: parseInt(nights),
        cityId: parseInt(cityId),
        hotelId: parseInt(hotelId),
        plan: plan || null,
        rooms: parseInt(rooms),
        accommodationId: parseInt(accommodationId),
        tariffPackage: tariffPackage || null,
        accommodationNote: accommodationNote || null,
        extraBed: extraBed ? true : false,
        beds: parseInt(beds),
        // extraBedCost: parseFloat(extraBedCost) || null,
        extraBedCost:
          extraBedCost !== undefined && extraBedCost !== ""
            ? parseFloat(extraBedCost)
            : null,
        hotelBookingDate: parseDate(hotelBookingDate),
        bookingConfirmedBy: bookingConfirmedBy || null,
        confirmationNumber: confirmationNumber || null,
        billingInstructions: billingInstructions || null,
        specialRequirement: specialRequirement || null,
        notes: notes || null,
        billDescription: billDescription || null,
        amount: amount ? new Prisma.Decimal(amount) : null,
        totalAmount: totalAmount ? new Prisma.Decimal(totalAmount) : null,
        ...buildStandardLineCostData(req.body, totalAmount ?? amount),
      },
    });

    if (req.user?.agencyId && updatedHotelBooking.bookingId) {
      await prisma.$transaction(async (tx) => {
        await regenerateBookingDocuments(
          tx,
          updatedHotelBooking.bookingId,
          parseInt(req.user.agencyId, 10)
        );
      });
    }

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
    if (
      error.code === "P2003" ||
      error.message.includes("Foreign key constraint failed")
    ) {
      return res.status(409).json({
        errors: {
          message:
            "Cannot delete this Hotel Booking because it is referenced in related data. Please remove the related references before deleting.",
        },
      });
    }
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
      include: {
        hotel: true,
        accommodation: true,
        city: true,
      },
    });

    res.status(200).json({ hotelBookings });
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch hotel bookings",
        details: error.message,
      },
    });
  }
};

const downloadHotelVoucher = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const agencyId = parseInt(req.user.agencyId, 10);

    const hotelBooking = await prisma.hotelBooking.findFirst({
      where: { id, agencyId },
      include: {
        hotel: true,
        city: true,
        accommodation: true,
        agency: true,
        booking: {
          include: { client: true },
        },
      },
    });

    if (!hotelBooking) {
      return res
        .status(404)
        .json({ errors: { message: "Hotel booking not found" } });
    }

    const hotel = hotelBooking.hotel || {};
    const booking = hotelBooking.booking || {};
    const client = booking.client || {};
    const hotelAddress = [
      hotel.hotelAddressLine1,
      hotel.hotelAddressLine2,
      hotel.hotelAddressLine3,
    ]
      .filter(Boolean)
      .join(", ");
    const hotelPhone = [hotel.hotelContactNo1, hotel.hotelContactNo2]
      .filter(Boolean)
      .join(" / ");

    const folder = path.join(
      __dirname,
      "..",
      "..",
      "invoices",
      "booking",
      "hotelVoucher",
      String(id)
    );
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    const filePath = path.join(folder, `HRV-${hotelBooking.hrvNumber || id}.pdf`);

    await generateHotelVoucher(
      {
        agencyDetails: buildAgencyDetails(hotelBooking.agency),
        hotelName: hotel.hotelName || "",
        hotelAddress,
        hotelPhone,
        bookingNumber: booking.bookingNumber || "",
        hotelBookingDate: hotelBooking.hotelBookingDate,
        hrvNumber: hotelBooking.hrvNumber || "",
        guestName: client.clientName || "",
        numberOfAdults: booking.numberOfAdults,
        numberOfChildren5To11: booking.numberOfChildren5To11,
        numberOfChildrenUnder5: booking.numberOfChildrenUnder5,
        totalTravelers: booking.totalTravelers,
        rooms: hotelBooking.rooms,
        accommodationName: hotelBooking.accommodation?.accommodationName || "",
        accommodationNote: hotelBooking.accommodationNote || "",
        checkInDate: hotelBooking.checkInDate,
        checkOutDate: hotelBooking.checkOutDate,
        nights: hotelBooking.nights,
        plan: hotelBooking.plan || "",
        cityName: hotelBooking.city?.cityName || "",
        bookingConfirmedBy: hotelBooking.bookingConfirmedBy || "",
        confirmationNumber: hotelBooking.confirmationNumber || "",
        notes: hotelBooking.notes || "",
        specialRequirement: hotelBooking.specialRequirement || "",
        billingInstructions: hotelBooking.billingInstructions || "",
      },
      filePath
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="HotelVoucher-${hotelBooking.hrvNumber || id}.pdf"`
    );
    return res.sendFile(path.resolve(filePath));
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to open hotel voucher",
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
  downloadHotelVoucher,
};
