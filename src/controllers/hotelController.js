const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors"); // For consistent error handling

// Get all hotels with pagination, sorting, and search
const getHotels = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

  try {
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: "User does not belong to any Agency" });
    }

    const whereClause = {
      agencyId: req.user.agencyId, // Add agency filter
      OR: [
        { hotelName: { contains: search } },
        { hotelCity: { contains: search } },
        { contactPerson: { contains: search } },
        { hotelContactNo1: { contains: search } },
        { officeContactNo1: { contains: search } },
      ],
    };

    const hotels = await prisma.hotel.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    const totalHotels = await prisma.hotel.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalHotels / limit);

    res.json({
      hotels,
      page,
      totalPages,
      totalHotels,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch hotels",
        details: error.message,
      },
    });
  }
};

// Create a new hotel
const createHotel = async (req, res, next) => {
  const schema = z
    .object({
      hotelName: z
        .string()
        .min(1, "Hotel name cannot be left blank.")
        .max(100, "Hotel name must not exceed 100 characters."),
    })
    .superRefine(async (data, ctx) => {
      if (!req.user.agencyId) {
        return res
          .status(404)
          .json({ message: "User does not belong to any Agency" });
      }
      const existingHotel = await prisma.hotel.findFirst({
        where: {
          AND: [
            { hotelName: data.hotelName },
            { agencyId: parseInt(req.user.agencyId) },
          ],
        },
      });

      if (existingHotel) {
        ctx.addIssue({
          path: ["hotelName"],
          message: `Hotel with name ${data.hotelName} already exists.`,
        });
      }
    });

  const validationErrors = await validateRequest(schema, req.body, res);

  try {
    const newHotel = await prisma.hotel.create({
      data: { ...req.body, agencyId: req.user.agencyId },
    });

    res.status(201).json(newHotel);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to create hotel",
        details: error.message,
      },
    });
  }
};

// Get a hotel by ID
const getHotelById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const hotel = await prisma.hotel.findFirst({
      where: {
        AND: [
          { id: parseInt(id, 10) },
          { agencyId: parseInt(req.user.agencyId) },
        ],
      },
    });

    if (!hotel) {
      return res.status(404).json({ errors: { message: "Hotel not found" } });
    }

    res.status(200).json(hotel);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch hotel",
        details: error.message,
      },
    });
  }
};

// Update a hotel
const updateHotel = async (req, res, next) => {
  const schema = z
    .object({
      hotelName: z
        .string()
        .min(1, "Hotel name cannot be left blank.")
        .max(100, "Hotel name must not exceed 100 characters."),
    })
    .superRefine(async (data, ctx) => {
      if (!req.user.agencyId) {
        return res
          .status(404)
          .json({ message: "User does not belong to any Agency" });
      }
      const { id } = req.params;

      const existingHotel = await prisma.hotel.findFirst({
        where: {
          AND: [
            { hotelName: data.hotelName },
            { agencyId: parseInt(req.user.agencyId) },
          ],
        },
        select: { id: true },
      });

      if (existingHotel && existingHotel.id !== parseInt(id)) {
        ctx.addIssue({
          path: ["hotelName"],
          message: `Hotel with name ${data.hotelName} already exists.`,
        });
      }
    });

  const validationErrors = await validateRequest(schema, req.body, res);

  const { id } = req.params;

  try {
    const updatedHotel = await prisma.hotel.update({
      where: { id: parseInt(id, 10) },
      data: { ...req.body },
    });

    res.status(200).json(updatedHotel);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "Hotel not found" } });
    }
    return res.status(500).json({
      errors: {
        message: "Failed to update hotel",
        details: error.message,
      },
    });
  }
};

// Delete a hotel
const deleteHotel = async (req, res, next) => {
  const { id } = req.params;

  try {
    await prisma.hotel.delete({
      where: { id: parseInt(id, 10) },
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "Hotel not found" } });
    }
    res.status(500).json({
      errors: {
        message: "Failed to delete hotel",
        details: error.message,
      },
    });
  }
};

// Get all hotels without pagination, sorting, and search
const getAllHotels = async (req, res, next) => {
  try {
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: "User does not belong to any Agency" });
    }

    const hotels = await prisma.hotel.findMany({
      where: {
        agencyId: req.user.agencyId,
      },
    });

    res.status(200).json(hotels);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch hotels",
        details: error.message,
      },
    });
  }
};

module.exports = {
  getHotels,
  createHotel,
  getHotelById,
  updateHotel,
  deleteHotel,
  getAllHotels,
};
