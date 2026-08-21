const path = require("path");
const fs = require("fs");
const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const dayjs = require("dayjs");
const generateVehicleHRVNumber = require("../utils/generateVehicleHRVNumber");
const { buildStandardLineCostData } = require("../utils/lineCostingPersist");
const { regenerateBookingDocuments } = require("../utils/bookingDocumentService");
const { buildAgencyDetails } = require("../utils/Invoice/agencyClientDetails");
const generateVehicleVoucher = require("../utils/Invoice/generateVehicleVoucher");
// Helper function to parse date strings into Date objects
const parseDate = (value) => {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  return dayjs(value).isValid() ? new Date(value) : undefined;
};

const createVehicleBooking = async (req, res) => {
  // Validate at least one required field; extend schema as needed.
  const schema = z.object({
    fromDate: z.string().min(1, "from date is required."),
  });
  const { id } = req.params; // assuming bookingId comes from route parameter
  await validateRequest(schema, req.body, res);

  try {
    const {
      vehicleBookingDate,
      vehicleId,
      numberOfVehicles,
      fromDate,
      toDate,
      days,
      cityId,
      agentId,
      pickupPlace,
      terms,
      specialRequest,
      vehicleNote,
      specialNote,
      summaryNote,
      billDescription,
      vehicleItineraries,
      vehicleHotelBookings,
      amount,
    } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const vehicleHrvNumber = await generateVehicleHRVNumber(
        tx,
        req.user.agencyId
      );

      const newVehicleBooking = await tx.vehicleBooking.create({
        data: {
          bookingId: parseInt(id),
          agencyId: parseInt(req.user.agencyId),
          vehicleHrvNumber,
          vehicleBookingDate: parseDate(vehicleBookingDate),
          vehicleId: parseInt(vehicleId),
          numberOfVehicles: parseInt(numberOfVehicles),
          fromDate: parseDate(fromDate),
          toDate: parseDate(toDate),
          days: parseInt(days),
          cityId: parseInt(cityId),
          agentId: parseInt(agentId),
          pickupPlace,
          terms: terms || null,
          specialRequest: specialRequest || null,
          vehicleNote: vehicleNote || null,
          specialNote: specialNote || null,
          summaryNote: summaryNote || null,
          billDescription: billDescription || null,
          amount: amount ? new Prisma.Decimal(amount) : null,
          ...buildStandardLineCostData(req.body, amount),
          vehicleItineraries: {
            create: (vehicleItineraries || []).map((itinerary) => ({
              day: parseInt(itinerary.day),
              date: parseDate(itinerary.date),
              description: itinerary.description,
              cityId: itinerary.cityId ? parseInt(itinerary.cityId) : null,
            })),
          },
          vehicleHotelBookings: {
            create: (vehicleHotelBookings || []).map((hotel) => ({
              cityId: parseInt(hotel.cityId),
              hotelId: parseInt(hotel.hotelId),
              checkInDate: parseDate(hotel.checkInDate),
              checkOutDate: parseDate(hotel.checkOutDate),
              numberOfRooms: parseInt(hotel.numberOfRooms),
              plan: hotel.plan,
              numberOfNights: parseInt(hotel.numberOfNights),
            })),
          },
        },
      });
      if (req.user?.agencyId) {
        await regenerateBookingDocuments(
          tx,
          parseInt(id, 10),
          parseInt(req.user.agencyId, 10)
        );
      }
      return { newVehicleBooking };
    });

    res.status(201).json(result.newVehicleBooking);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to create vehicle booking",
        details: error.message,
      },
    });
  }
};

const getVehicleBookingById = async (req, res) => {
  const { id } = req.params;
  try {
    const vehicleBooking = await prisma.vehicleBooking.findUnique({
      where: { id: parseInt(id) },
      include: {
        vehicle: true,
        city: true,
        agent: true,
        vehicleItineraries: {
          include: {
            city: true,
          },
        },
        vehicleHotelBookings: {
          include: {
            hotel: true,
            city: true,
          },
        },
      },
    });
    if (!vehicleBooking) {
      return res
        .status(404)
        .json({ errors: { message: "Vehicle booking not found" } });
    }
    res.status(200).json(vehicleBooking);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch vehicle booking",
        details: error.message,
      },
    });
  }
};

const updateVehicleBooking = async (req, res) => {
  const schema = z.object({
    fromDate: z.string().min(1, "from date is required."),
  });
  await validateRequest(schema, req.body, res);
  const { id } = req.params;

  try {
    const {
      vehicleBookingDate,
      vehicleId,
      numberOfVehicles,
      fromDate,
      toDate,
      days,
      cityId,
      agentId,
      pickupPlace,
      terms,
      specialRequest,
      vehicleNote,
      specialNote,
      summaryNote,
      billDescription,
      vehicleItineraries,
      vehicleHotelBookings,
      amount,
    } = req.body;

    // satrt
    const result = await prisma.$transaction(async (tx) => {
      // First, delete familyFriends that are not in the new familyFriends array
      await tx.vehicleItinerary.deleteMany({
        where: {
          vehicleBookingId: parseInt(id, 10),
          id: {
            notIn: vehicleItineraries
              .filter((v) => parseInt(v.itineraryId))
              .map((v) => parseInt(v.itineraryId)), // Only keep existing friends in the list
          },
        },
      });

      await tx.vehicleHotelBooking.deleteMany({
        where: {
          vehicleBookingId: parseInt(id, 10),
          id: {
            notIn: vehicleHotelBookings
              .filter((v) => parseInt(v.vehicleHotelId))
              .map((v) => parseInt(v.vehicleHotelId)), // Only keep existing friends in the list
          },
        },
      });

      // Now, proceed to update the client and upsert familyFriends
      const updatedVehicleBooking = await tx.vehicleBooking.update({
        where: { id: parseInt(id, 10) },
        data: {
          vehicleBookingDate: parseDate(vehicleBookingDate),
          vehicleId: parseInt(vehicleId),
          numberOfVehicles: parseInt(numberOfVehicles),
          fromDate: parseDate(fromDate),
          toDate: parseDate(toDate),
          days: parseInt(days),
          cityId: parseInt(cityId),
          agentId: parseInt(agentId),
          pickupPlace,
          terms: terms || null,
          specialRequest: specialRequest || null,
          vehicleNote: vehicleNote || null,
          specialNote: specialNote || null,
          summaryNote: summaryNote || null,
          billDescription: billDescription || null,
          amount: amount ? new Prisma.Decimal(amount) : null,
          ...buildStandardLineCostData(req.body, amount),

          vehicleItineraries: {
            upsert: vehicleItineraries
              .filter((vehicle) => !!parseInt(vehicle.itineraryId)) // Only existing friends
              .map((vehicle) => ({
                where: { id: parseInt(vehicle.itineraryId) },
                update: {
                  day: parseInt(vehicle.day),
                  date: parseDate(vehicle.date) || null,
                  description: vehicle.description || null,
                  cityId: vehicle.cityId ? parseInt(vehicle.cityId) : null,
                },
                create: {
                  day: parseInt(vehicle.day),
                  date: parseDate(vehicle.date) || null,
                  description: vehicle.description || null,
                  cityId: vehicle.cityId ? parseInt(vehicle.cityId) : null,
                },
              })),
            create: vehicleItineraries
              .filter((vehicle) => !parseInt(vehicle.itineraryId)) // Only new friends
              .map((vehicle) => ({
                day: parseInt(vehicle.day),
                date: parseDate(vehicle.date) || null,
                description: vehicle.description || null,
                cityId: vehicle.cityId ? parseInt(vehicle.cityId) : null,
              })),
          },
          vehicleHotelBookings: {
            upsert: vehicleHotelBookings
              .filter((hotel) => !!parseInt(hotel.vehicleHotelId)) // Only existing friends
              .map((hotel) => ({
                where: { id: parseInt(hotel.vehicleHotelId) },
                update: {
                  cityId: parseInt(hotel.cityId),
                  hotelId: parseInt(hotel.hotelId),
                  checkInDate: parseDate(hotel.checkInDate),
                  checkOutDate: parseDate(hotel.checkOutDate),
                  numberOfRooms: parseInt(hotel.numberOfRooms),
                  plan: hotel.plan,
                  numberOfNights: parseInt(hotel.numberOfNights),
                },
                create: {
                  cityId: parseInt(hotel.cityId),
                  hotelId: parseInt(hotel.hotelId),
                  checkInDate: parseDate(hotel.checkInDate),
                  checkOutDate: parseDate(hotel.checkOutDate),
                  numberOfRooms: parseInt(hotel.numberOfRooms),
                  plan: hotel.plan,
                  numberOfNights: parseInt(hotel.numberOfNights),
                },
              })),
            create: vehicleHotelBookings
              .filter((hotel) => !parseInt(hotel.vehicleHotelId)) // Only new friends
              .map((hotel) => ({
                cityId: parseInt(hotel.cityId),
                hotelId: parseInt(hotel.hotelId),
                checkInDate: parseDate(hotel.checkInDate),
                checkOutDate: parseDate(hotel.checkOutDate),
                numberOfRooms: parseInt(hotel.numberOfRooms),
                plan: hotel.plan,
                numberOfNights: parseInt(hotel.numberOfNights),
              })),
          },
        },
      });

      if (req.user?.agencyId && updatedVehicleBooking.bookingId) {
        await regenerateBookingDocuments(
          tx,
          updatedVehicleBooking.bookingId,
          parseInt(req.user.agencyId, 10)
        );
      }

      return {
        updatedVehicleBooking: updatedVehicleBooking,
      };
    });

    // end

    res.status(200).json(result.updatedVehicleBooking);
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ errors: { message: "Vehicle booking not found" } });
    }
    res.status(500).json({
      errors: {
        message: "Failed to update vehicle booking",
        details: error.message,
      },
    });
  }
};

const deleteVehicleBooking = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.vehicleBooking.delete({
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
            "Cannot delete this Vehicle Booking because it is referenced in related data. Please remove the related references before deleting.",
        },
      });
    }
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ errors: { message: "Vehicle booking not found" } });
    }
    res.status(500).json({
      errors: {
        message: "Failed to delete vehicle booking",
        details: error.message,
      },
    });
  }
};

const getAllVehicleBookingsByBookingId = async (req, res) => {
  const { id } = req.params; // bookingId
  try {
    const vehicleBookings = await prisma.vehicleBooking.findMany({
      where: { bookingId: parseInt(id) },
      include: {
        vehicle: true,
        city: true,
        agent: true,
      },
    });
    res.status(200).json({ vehicleBookings });
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch vehicle bookings",
        details: error.message,
      },
    });
  }
};

const downloadVehicleVoucher = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const agencyId = parseInt(req.user.agencyId, 10);

    const vehicleBooking = await prisma.vehicleBooking.findFirst({
      where: { id, agencyId },
      include: {
        vehicle: true,
        city: true,
        agent: true,
        agency: true,
        booking: {
          include: { client: true },
        },
      },
    });

    if (!vehicleBooking) {
      return res
        .status(404)
        .json({ errors: { message: "Vehicle booking not found" } });
    }

    const booking = vehicleBooking.booking || {};
    const client = booking.client || {};
    const agent = vehicleBooking.agent || {};
    const guestContact = [client.mobile1, client.mobile2]
      .filter(Boolean)
      .join(" / ");
    const agentContact = [agent.mobile1, agent.mobile2]
      .filter(Boolean)
      .join(" / ");

    const folder = path.join(
      __dirname,
      "..",
      "..",
      "invoices",
      "booking",
      "vehicleVoucher",
      String(id)
    );
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    const filePath = path.join(
      folder,
      `VRV-${vehicleBooking.vehicleHrvNumber || id}.pdf`
    );

    await generateVehicleVoucher(
      {
        agencyDetails: buildAgencyDetails(vehicleBooking.agency),
        bookingNumber: booking.bookingNumber || "",
        vehicleBookingDate: vehicleBooking.vehicleBookingDate,
        vehicleHrvNumber: vehicleBooking.vehicleHrvNumber || "",
        guestName: client.clientName || "",
        totalTravelers: booking.totalTravelers,
        numberOfAdults: booking.numberOfAdults,
        numberOfChildren5To11: booking.numberOfChildren5To11,
        numberOfChildrenUnder5: booking.numberOfChildrenUnder5,
        guestContact,
        agentName: agent.agentName || "",
        agentContact,
        numberOfVehicles: vehicleBooking.numberOfVehicles,
        vehicleName: vehicleBooking.vehicle?.vehicleName || "",
        vehicleNote: vehicleBooking.vehicleNote || "",
        fromDate: vehicleBooking.fromDate,
        toDate: vehicleBooking.toDate,
        days: vehicleBooking.days,
        pickupPlace: vehicleBooking.pickupPlace || "",
        cityName: vehicleBooking.city?.cityName || "",
        summaryNote: vehicleBooking.summaryNote || "",
        terms: vehicleBooking.terms || "",
        specialRequest: vehicleBooking.specialRequest || "",
        specialNote: vehicleBooking.specialNote || "",
      },
      filePath
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="VehicleVoucher-${vehicleBooking.vehicleHrvNumber || id}.pdf"`
    );
    return res.sendFile(path.resolve(filePath));
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to open vehicle voucher",
        details: error.message,
      },
    });
  }
};

module.exports = {
  createVehicleBooking,
  getVehicleBookingById,
  updateVehicleBooking,
  deleteVehicleBooking,
  getAllVehicleBookingsByBookingId,
  downloadVehicleVoucher,
};
