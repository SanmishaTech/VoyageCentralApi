const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const dayjs = require("dayjs");
const generateVehicleHRVNumber = require("../utils/generateVehicleHRVNumber");
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
          vehicleItineraries: {
            create: (vehicleItineraries || []).map((itinerary) => ({
              day: itinerary.day,
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
    } = req.body;

    // satrt
    const result = await prisma.$transaction(async (tx) => {
      // First, delete familyFriends that are not in the new familyFriends array
      await tx.vehicleItineraries.deleteMany({
        where: {
          vehicleBookingId: parseInt(id, 10),
          id: {
            notIn: vehicleItineraries
              .filter((v) => parseInt(v.itineraryId))
              .map((v) => parseInt(v.itineraryId)), // Only keep existing friends in the list
          },
        },
      });

      await tx.vehicleHotelBookings.deleteMany({
        where: {
          vehicleBookingId: parseInt(id, 10),
          id: {
            notIn: vehicleHotelBookings
              .filter((v) => parseInt(v.hotelId))
              .map((v) => parseInt(v.hotelId)), // Only keep existing friends in the list
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
              .filter((hotel) => !!parseInt(hotel.hotelId)) // Only existing friends
              .map((hotel) => ({
                where: { id: parseInt(hotel.hotelId) },
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
            create: vehicleItineraries
              .filter((hotel) => !parseInt(hotel.hotelId)) // Only new friends
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

      return {
        updatedClient: updatedClient,
      };
    });

    // end

    const updatedVehicleBooking = await prisma.vehicleBooking.update({
      where: { id: parseInt(id) },
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
      },
    });
    res.status(200).json(updatedVehicleBooking);
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

module.exports = {
  createVehicleBooking,
  getVehicleBookingById,
  updateVehicleBooking,
  deleteVehicleBooking,
  getAllVehicleBookingsByBookingId,
};
