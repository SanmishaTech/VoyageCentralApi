const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const dayjs = require("dayjs");
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors"); // For consistent error handling
const generateBookingNumber = require("../utils/generateBookingNumber");
const roles = require("../config/roles");
// Get all tour enquiries with pagination, sorting, and search
const getBookings = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";
  // start
  let agencyId = req.user.agencyId;
  let branchId = req.user.branchId;
  let role = req.user.role;

  let baseWhereClause = {
    agencyId: agencyId,
    bookingType: "Confirm",
  };

  // If user is not admin and belongs to a branch, filter by branch
  if (role !== "admin" && branchId) {
    baseWhereClause.branchId = branchId;
  }
  // end

  // Additional filters
  const fromBookingDate = req.query.fromBookingDate
    ? new Date(req.query.fromBookingDate)
    : null;
  const toBookingDate = req.query.toBookingDate
    ? new Date(req.query.toBookingDate)
    : null;
  const tourTitle = req.query.tourTitle || "";
  const clientName = req.query.clientName || "";

  try {
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: "User does not belong to any Agency" });
    }

    const whereClause = {
      ...baseWhereClause,
      AND: [
        // Filter by booking date range
        fromBookingDate && toBookingDate
          ? {
              bookingDate: {
                gte: fromBookingDate,
                lte: toBookingDate,
              },
            }
          : {},
        // Filter by tour title
        tourTitle
          ? {
              tour: {
                tourTitle: {
                  contains: tourTitle,
                },
              },
            }
          : {},
        // Filter by client name
        clientName
          ? {
              client: {
                clientName: {
                  contains: clientName,
                },
              },
            }
          : {},
      ],
      OR: [
        { bookingNumber: { contains: search } },
        { branch: { branchName: { contains: search } } },
        { client: { clientName: { contains: search } } },
        { tour: { tourTitle: { contains: search } } },
      ],
    };

    // Handle ordering by related fields
    const orderByClause =
      sortBy === "clientName"
        ? { client: { clientName: sortOrder } }
        : sortBy === "branchName"
        ? { branch: { branchName: sortOrder } }
        : sortBy === "tourTitle"
        ? { tour: { tourTitle: sortOrder } }
        : { [sortBy]: sortOrder };

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: orderByClause,
      include: {
        tour: true, // Include tour details
        client: true, // Include client details
        branch: true, // Include branch details
      },
    });

    const totalBookings = await prisma.booking.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalBookings / limit);

    res.json({
      bookings,
      page,
      totalPages,
      totalBookings,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch bookings",
        details: error.message,
      },
    });
  }
};

const getTourEnquiries = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

  // Additional filters
  const fromBookingDate = req.query.fromBookingDate
    ? new Date(req.query.fromBookingDate)
    : null;
  const toBookingDate = req.query.toBookingDate
    ? new Date(req.query.toBookingDate)
    : null;
  const tourTitle = req.query.tourTitle || "";
  const clientName = req.query.clientName || "";

  try {
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: "User does not belong to any Agency" });
    }

    const whereClause = {
      agencyId: req.user.agencyId,
      bookingType: "Enquiry",
      AND: [
        // Filter by booking date range
        fromBookingDate && toBookingDate
          ? {
              bookingDate: {
                gte: fromBookingDate,
                lte: toBookingDate,
              },
            }
          : {},
        // Filter by tour title
        tourTitle
          ? {
              tour: {
                tourTitle: {
                  contains: tourTitle,
                },
              },
            }
          : {},
        // Filter by client name
        clientName
          ? {
              client: {
                clientName: {
                  contains: clientName,
                },
              },
            }
          : {},
      ],
      OR: [
        { bookingNumber: { contains: search } },
        { branch: { branchName: { contains: search } } },
        { client: { clientName: { contains: search } } },
        { tour: { tourTitle: { contains: search } } },
      ],
    };

    // Handle ordering by related fields
    const orderByClause =
      sortBy === "clientName"
        ? { client: { clientName: sortOrder } }
        : sortBy === "branchName"
        ? { branch: { branchName: sortOrder } }
        : sortBy === "tourTitle"
        ? { tour: { tourTitle: sortOrder } }
        : { [sortBy]: sortOrder };

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: orderByClause,
      include: {
        tour: true, // Include tour details
        client: true, // Include client details
        branch: true, // Include branch details
      },
    });

    const totalBookings = await prisma.booking.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalBookings / limit);

    res.json({
      bookings,
      page,
      totalPages,
      totalBookings,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch bookings",
        details: error.message,
      },
    });
  }
};

// Create a new tour enquiry
const createBooking = async (req, res, next) => {
  const schema = z
    .object({
      clientId: z.number().min(1, "Client ID cannot be blank."),
      branchId: z.string().optional(),
      bookingDetails: z
        .array(
          z.object({
            day: z
              .number({
                required_error: "Day is required.",
                invalid_type_error: "Day must be a number.",
              })
              .int("Day must be an integer."),
            date: z.string().min(1, "Date cannot be blank."),
            description: z.string().min(1, "Description cannot be blank."),
            cityId: z.string().optional(),
          })
        )
        .optional(),
    })
    .superRefine(async (data, ctx) => {
      // You must define this logic *after* you have access to `req`
      const userRole = req.user.role;

      if (
        userRole === roles.ADMIN &&
        (!data.branchId || data.branchId.trim() === "")
      ) {
        ctx.addIssue({
          path: ["branchId"],
          code: z.ZodIssueCode.custom,
          message: "Branch ID is required for admin users.",
        });
      }
    });
  const validationErrors = await validateRequest(schema, req.body, res);

  try {
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: "User does not belong to any Agency" });
    }

    const parseDate = (value) => {
      if (typeof value !== "string" || value.trim() === "") return undefined;
      return dayjs(value).isValid() ? new Date(value) : undefined;
    };

    const {
      bookingDate,
      journeyDate,
      departureDate,
      budgetField,
      clientId,
      numberOfAdults,
      numberOfChildren5To11,
      numberOfChildrenUnder5,
      tourId,
      bookingDetail,
      isJourney,
      isHotel,
      isVehicle,
      isPackage,
      bookingDetails,
      bookingType,
    } = req.body;

    let branchId = null;
    if (req.user.role === roles.ADMIN) {
      branchId = req.body.branchId;
    } else {
      branchId = req.user.branchId;
    }

    const result = await prisma.$transaction(async (tx) => {
      const bookingNumber = await generateBookingNumber(tx, req.user.agencyId);
      const newBooking = await tx.booking.create({
        data: {
          bookingNumber: bookingNumber,
          agencyId: req.user.agencyId,
          bookingDate: parseDate(bookingDate),
          journeyDate: parseDate(journeyDate),
          bookingType: bookingType ? bookingType : null,
          departureDate: parseDate(departureDate),
          budgetField: budgetField || null,
          clientId: parseInt(clientId, 10),
          numberOfAdults: numberOfAdults ? parseInt(numberOfAdults, 10) : null, // Parse as integer
          numberOfChildren5To11: numberOfChildren5To11
            ? parseInt(numberOfChildren5To11, 10)
            : null, // Parse as integer
          numberOfChildrenUnder5: numberOfChildrenUnder5
            ? parseInt(numberOfChildrenUnder5, 10)
            : null, // Parse as integer
          branchId: parseInt(branchId, 10),
          tourId: tourId ? parseInt(tourId, 10) : null,
          bookingDetail: bookingDetail || null,
          isJourney: !!isJourney, // Convert to boolean
          isHotel: !!isHotel, // Convert to boolean
          isVehicle: !!isVehicle, // Convert to boolean
          isPackage: !!isPackage, // Convert to boolean
          bookingDetails: {
            create: (bookingDetails || []).map((detail) => ({
              day: detail.day ? parseInt(detail.day, 10) : null, // Parse as integer
              date: parseDate(detail.date),
              description: detail.description || "",
              cityId: detail.cityId ? parseInt(detail.cityId, 10) : null, // Parse as integer
            })),
          },
        },
      });

      return {
        newBooking: newBooking,
      };
    });

    res.status(201).json(result.newBooking);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to create booking",
        details: error.message,
      },
    });
  }
};

// Get a tour enquiry by ID
const getBookingById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const booking = await prisma.booking.findFirst({
      where: {
        AND: [
          { id: parseInt(id, 10) },
          { agencyId: parseInt(req.user.agencyId) },
        ],
      },
      include: {
        hotelBookings: true,
        branch: true,
        bookingDetails: {
          include: {
            city: {
              select: {
                cityName: true,
              },
            },
          },
        }, // Include tourBookingDetails in the response
        client: {
          select: {
            clientName: true,
            familyFriends: true,
          },
        },
        tour: {
          select: {
            id: true,
            tourTitle: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ errors: { message: "Booking not found" } });
    }

    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch booking",
        details: error.message,
      },
    });
  }
};

// Update a tour enquiry
const updateBooking = async (req, res, next) => {
  const schema = z
    .object({
      budgetField: z.string().optional(),
      branchId: z.string().optional(),
      bookingDetails: z
        .array(
          z.object({
            bookingDetailId: z.string().optional(), // Include ID for existing booking details
            day: z.number().min(1, "Day must be at least 1."),
            date: z.string().min(1, "Date cannot be blank."),
            description: z.string().min(1, "Description cannot be blank."),
          })
        )
        .optional(),
    })
    .superRefine(async (data, ctx) => {
      // You must define this logic *after* you have access to `req`
      const userRole = req.user.role;

      if (
        userRole === roles.ADMIN &&
        (!data.branchId || data.branchId.trim() === "")
      ) {
        ctx.addIssue({
          path: ["branchId"],
          code: z.ZodIssueCode.custom,
          message: "Branch ID is required for admin users.",
        });
      }
    });

  const validationErrors = await validateRequest(schema, req.body, res);

  const { id } = req.params;
  const {
    bookingNumber,
    bookingDate,
    journeyDate,
    departureDate,
    budgetField,
    clientId,
    numberOfAdults,
    numberOfChildren5To11,
    numberOfChildrenUnder5,
    tourId,
    bookingDetail,
    isJourney,
    isHotel,
    isVehicle,
    isPackage,
    bookingDetails = [],
    bookingType,
  } = req.body;

  try {
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: "User does not belong to any Agency" });
    }

    let branchId = null;
    if (req.user.role === roles.ADMIN) {
      branchId = req.body.branchId;
    } else {
      branchId = req.user.branchId;
    }

    const parseDate = (value) => {
      if (typeof value !== "string" || value.trim() === "") return undefined;
      return dayjs(value).isValid() ? new Date(value) : undefined;
    };

    const result = await prisma.$transaction(async (tx) => {
      // First, delete familyFriends that are not in the new familyFriends array
      await tx.bookingDetail.deleteMany({
        where: {
          bookingId: parseInt(id, 10),
          id: {
            notIn: bookingDetails
              .filter((d) => parseInt(d.bookingDetailId))
              .map((d) => parseInt(d.bookingDetailId)), // Only keep existing friends in the list
          },
        },
      });

      // Now, proceed to update the client and upsert familyFriends
      const updatedBooking = await tx.booking.update({
        where: { id: parseInt(id, 10) },
        data: {
          bookingDate: parseDate(bookingDate),
          journeyDate: parseDate(journeyDate),
          departureDate: parseDate(departureDate),
          budgetField: budgetField || null,
          bookingType: bookingType ? bookingType : null,
          clientId: parseInt(clientId, 10),
          numberOfAdults: numberOfAdults ? parseInt(numberOfAdults, 10) : null, // Parse as integer
          numberOfChildren5To11: numberOfChildren5To11
            ? parseInt(numberOfChildren5To11, 10)
            : null, // Parse as integer
          numberOfChildrenUnder5: numberOfChildrenUnder5
            ? parseInt(numberOfChildrenUnder5, 10)
            : null, // Parse as integer
          branchId: parseInt(branchId),
          tourId: tourId ? parseInt(tourId, 10) : null,
          bookingDetail: bookingDetail || null,
          isJourney: !!isJourney, // Convert to boolean
          isHotel: !!isHotel, // Convert to boolean
          isVehicle: !!isVehicle, // Convert to boolean
          isPackage: !!isPackage, // Convert to boolean
          bookingDetails: {
            upsert: bookingDetails
              .filter((detail) => !!parseInt(detail.bookingDetailId)) // Only existing friends
              .map((detail) => ({
                where: { id: parseInt(detail.bookingDetailId) },
                update: {
                  day: detail.day ? parseInt(detail.day, 10) : null, // Parse as integer
                  description: detail.description,
                  date: parseDate(detail.date),
                  cityId: detail.cityId ? parseInt(detail.cityId, 10) : null,
                },
                create: {
                  day: detail.day ? parseInt(detail.day, 10) : null, // Parse as integer
                  description: detail.description,
                  date: parseDate(detail.date),
                  cityId: detail.cityId ? parseInt(detail.cityId, 10) : null,
                },
              })),
            create: bookingDetails
              .filter((detail) => !parseInt(detail.bookingDetailId)) // Only new friends
              .map((detail) => ({
                day: detail.day ? parseInt(detail.day, 10) : null, // Parse as integer
                description: detail.description,
                date: parseDate(detail.date),
                cityId: detail.cityId ? parseInt(detail.cityId, 10) : null,
              })),
          },
        },
      });

      return {
        updatedBooking: updatedBooking,
      };
    });

    res.status(200).json(result);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "Booking not found" } });
    }
    return res.status(500).json({
      errors: {
        message: "Failed to update booking",
        details: error.message,
      },
    });
  }
};
//tour booking number generate.
// Delete a booking
const deleteBooking = async (req, res, next) => {
  const { id } = req.params;

  try {
    await prisma.booking.delete({
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
            "Cannot delete this Booking because it is referenced in related data (e.g. hotel booking,vehicle booking, etc). Please remove those first.",
        },
      });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "Booking not found" } });
    }
    res.status(500).json({
      errors: {
        message: "Failed to delete booking",
        details: error.message,
      },
    });
  }
};

module.exports = {
  getBookings,
  createBooking,
  getBookingById,
  deleteBooking,
  updateBooking,
  getTourEnquiries,
};
