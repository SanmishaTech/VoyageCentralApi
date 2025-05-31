const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const dayjs = require("dayjs");
const { z } = require("zod");
const validateRequest = require("../../utils/validateRequest");
const createError = require("http-errors"); // For consistent error handling
const generateGroupBookingNumber = require("../../utils/groupBooking/generateGroupBookingNumber");
const roles = require("../../config/roles");
// Get all tour enquiries with pagination, sorting, and search
const getGroupBookings = async (req, res, next) => {
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
  const fromBookingDate = req.query.fromGBookingDate
    ? new Date(req.query.fromBookingDate)
    : null;
  const toBookingDate = req.query.toBookingDate
    ? new Date(req.query.toBookingDate)
    : null;
  const tourTitle = req.query.tourTitle || "";

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
              groupBookingDate: {
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
      ],
      OR: [
        { groupBookingNumber: { contains: search } },
        { branch: { branchName: { contains: search } } },
        { tour: { tourTitle: { contains: search } } },
      ],
    };

    // Handle ordering by related fields
    const orderByClause =
      sortBy === "branchName"
        ? { branch: { branchName: sortOrder } }
        : sortBy === "tourTitle"
        ? { tour: { tourTitle: sortOrder } }
        : { [sortBy]: sortOrder };

    const groupBookings = await prisma.groupBooking.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: orderByClause,
      include: {
        tour: true, // Include tour details
        branch: true, // Include branch details
      },
    });

    const totalGroupBookings = await prisma.groupBooking.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalGroupBookings / limit);

    res.json({
      groupBookings,
      page,
      totalPages,
      totalGroupBookings,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch group bookings",
        details: error.message,
      },
    });
  }
};

const getGroupBookingEnquiries = async (req, res, next) => {
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
              groupBookingDate: {
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
      ],
      OR: [
        { groupBookingNumber: { contains: search } },
        { branch: { branchName: { contains: search } } },
        { tour: { tourTitle: { contains: search } } },
      ],
    };

    // Handle ordering by related fields
    const orderByClause =
      sortBy === "branchName"
        ? { branch: { branchName: sortOrder } }
        : sortBy === "tourTitle"
        ? { tour: { tourTitle: sortOrder } }
        : { [sortBy]: sortOrder };

    const groupBookings = await prisma.groupBooking.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: orderByClause,
      include: {
        tour: true, // Include tour details
        branch: true, // Include branch details
      },
    });

    const totalGroupBookings = await prisma.groupBooking.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalGroupBookings / limit);

    res.json({
      groupBookings,
      page,
      totalPages,
      totalGroupBookings,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch group bookings",
        details: error.message,
      },
    });
  }
};

// Create a new tour enquiry
const createGroupBooking = async (req, res, next) => {
  const schema = z
    .object({
      branchId: z.string().optional(),
      groupBookingDetails: z
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
      groupBookingDate,
      journeyDate,
      tourId,
      bookingDetail,
      isJourney,
      isHotel,
      isVehicle,
      groupBookingDetails,
      bookingType,
    } = req.body;

    let branchId = null;
    if (req.user.role === roles.ADMIN) {
      branchId = req.body.branchId;
    } else {
      branchId = req.user.branchId;
    }

    const result = await prisma.$transaction(async (tx) => {
      const groupBookingNumber = await generateGroupBookingNumber(
        tx,
        req.user.agencyId
      );
      const newGroupBooking = await tx.groupBooking.create({
        data: {
          groupBookingNumber: groupBookingNumber,
          agencyId: req.user.agencyId,
          groupBookingDate: parseDate(groupBookingDate),
          journeyDate: parseDate(journeyDate),
          bookingType: bookingType ? bookingType : null,
          branchId: parseInt(branchId, 10),
          tourId: tourId ? parseInt(tourId, 10) : null,
          bookingDetail: bookingDetail || null,
          isJourney: !!isJourney, // Convert to boolean
          isHotel: !!isHotel, // Convert to boolean
          isVehicle: !!isVehicle, // Convert to boolean
          groupBookingDetails: {
            create: (groupBookingDetails || []).map((detail) => ({
              day: detail.day ? parseInt(detail.day, 10) : null, // Parse as integer
              date: parseDate(detail.date),
              description: detail.description || "",
              cityId: detail.cityId ? parseInt(detail.cityId, 10) : null, // Parse as integer
            })),
          },
        },
      });

      return {
        newGroupBooking: newGroupBooking,
      };
    });

    res.status(201).json(result.newGroupBooking);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to create group booking",
        details: error.message,
      },
    });
  }
};

// Get a tour enquiry by ID
const getGroupBookingById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const groupBooking = await prisma.groupBooking.findFirst({
      where: {
        AND: [
          { id: parseInt(id, 10) },
          { agencyId: parseInt(req.user.agencyId) },
        ],
      },
      include: {
        branch: true,
        groupBookingDetails: {
          include: {
            city: {
              select: {
                cityName: true,
              },
            },
          },
        }, // Include tourBookingDetails in the response
        tour: {
          select: {
            id: true,
            tourTitle: true,
          },
        },
      },
    });

    if (!groupBooking) {
      return res
        .status(404)
        .json({ errors: { message: "Group Booking not found" } });
    }

    res.status(200).json(groupBooking);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch group booking",
        details: error.message,
      },
    });
  }
};

// Update a tour enquiry
const updateGroupBooking = async (req, res, next) => {
  const schema = z
    .object({
      branchId: z.string().optional(),
      groupBookingDetails: z
        .array(
          z.object({
            groupBookingDetailId: z.string().optional(), // Include ID for existing booking details
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
    groupBookingDate,
    journeyDate,
    tourId,
    bookingDetail,
    isJourney,
    isHotel,
    isVehicle,
    groupBookingDetails = [],
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
      await tx.groupBookingDetail.deleteMany({
        where: {
          groupBookingId: parseInt(id, 10),
          id: {
            notIn: groupBookingDetails
              .filter((d) => parseInt(d.groupBookingDetailId))
              .map((d) => parseInt(d.groupBookingDetailId)), // Only keep existing friends in the list
          },
        },
      });

      // Now, proceed to update the client and upsert familyFriends
      const updatedGroupBooking = await tx.groupBooking.update({
        where: { id: parseInt(id, 10) },
        data: {
          groupBookingDate: parseDate(groupBookingDate),
          journeyDate: parseDate(journeyDate),
          bookingType: bookingType ? bookingType : null,
          branchId: parseInt(branchId),
          tourId: tourId ? parseInt(tourId, 10) : null,
          bookingDetail: bookingDetail || null,
          isJourney: !!isJourney, // Convert to boolean
          isHotel: !!isHotel, // Convert to boolean
          isVehicle: !!isVehicle, // Convert to boolean
          groupBookingDetails: {
            upsert: groupBookingDetails
              .filter((detail) => !!parseInt(detail.groupBookingDetailId)) // Only existing friends
              .map((detail) => ({
                where: { id: parseInt(detail.groupBookingDetailId) },
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
            create: groupBookingDetails
              .filter((detail) => !parseInt(detail.groupBookingDetailId)) // Only new friends
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
        updatedGroupBooking: updatedGroupBooking,
      };
    });

    res.status(200).json(result);
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ errors: { message: "group Booking not found" } });
    }
    return res.status(500).json({
      errors: {
        message: "Failed to update group booking",
        details: error.message,
      },
    });
  }
};
//tour booking number generate.
// Delete a booking
const deleteGroupBooking = async (req, res, next) => {
  const { id } = req.params;

  try {
    await prisma.groupBooking.delete({
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
            "Cannot delete this Group Booking because it is referenced in related data. Please remove those first.",
        },
      });
    }
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ errors: { message: "Group Booking not found" } });
    }
    res.status(500).json({
      errors: {
        message: "Failed to delete Group booking",
        details: error.message,
      },
    });
  }
};

module.exports = {
  getGroupBookings,
  createGroupBooking,
  getGroupBookingById,
  deleteGroupBooking,
  updateGroupBooking,
  getGroupBookingEnquiries,
};
