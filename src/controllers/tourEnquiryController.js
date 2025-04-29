const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const dayjs = require("dayjs");
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors"); // For consistent error handling
const generateBookingNumber = require("../utils/generateBookingNumber");
// Get all tour enquiries with pagination, sorting, and search
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
        { enquiryStatus: { contains: search } },
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

    const tourEnquiries = await prisma.tourEnquiry.findMany({
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

    const totalTourEnquiries = await prisma.tourEnquiry.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalTourEnquiries / limit);

    res.json({
      tourEnquiries,
      page,
      totalPages,
      totalTourEnquiries,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch tour enquiries",
        details: error.message,
      },
    });
  }
};

// Create a new tour enquiry
const createTourEnquiry = async (req, res, next) => {
  const schema = z.object({
    clientId: z.string().min(1, "Client ID cannot be blank."),
    tourBookingDetails: z
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
      bookingNumber,
      bookingDate,
      journeyDate,
      departureDate,
      budgetField,
      clientId,
      numberOfAdults,
      numberOfChildren5To11,
      numberOfChildrenUnder5,
      branchId,
      tourId,
      bookingDetails,
      isJourney,
      isHotel,
      isVehicle,
      isPackage,
      enquiryStatus,
      tourBookingDetails,
    } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const bookingNumber = await generateBookingNumber(tx, req.user.agencyId);
      const newTourEnquiry = await tx.tourEnquiry.create({
        data: {
          bookingNumber: bookingNumber,
          agencyId: req.user.agencyId,
          bookingDate: parseDate(bookingDate),
          journeyDate: parseDate(journeyDate),
          departureDate: parseDate(departureDate),
          budgetField: budgetField || null,
          clientId: parseInt(clientId, 10),
          numberOfAdults: numberOfAdults || null,
          numberOfChildren5To11: numberOfChildren5To11 || null,
          numberOfChildrenUnder5: numberOfChildrenUnder5 || null,
          branchId: req.user.branchId
            ? req.user.branchId
            : branchId
            ? parseInt(branchId, 10)
            : null,
          tourId: tourId ? parseInt(tourId, 10) : null,
          bookingDetails: bookingDetails || null,
          isJourney: isJourney || false,
          isHotel: isHotel || false,
          isVehicle: isVehicle || false,
          isPackage: isPackage || false,
          enquiryStatus: enquiryStatus || null,
          tourBookingDetails: {
            create: (tourBookingDetails || []).map((detail) => ({
              day: detail.day,
              date: parseDate(detail.date),
              description: detail.description,
              cityId: detail.cityId ? parseInt(detail.cityId, 10) : null,
            })),
          },
        },
      });

      return {
        newTourEnquiry: newTourEnquiry,
      };
    });

    res.status(201).json(result.newTourEnquiry);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to create tour enquiry",
        details: error.message,
      },
    });
  }
};

// Get a tour enquiry by ID
const getTourEnquiryById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const tourEnquiry = await prisma.tourEnquiry.findFirst({
      where: {
        AND: [
          { id: parseInt(id, 10) },
          { agencyId: parseInt(req.user.agencyId) },
        ],
      },
      include: {
        tourBookingDetails: true, // Include tourBookingDetails in the response
      },
    });

    if (!tourEnquiry) {
      return res
        .status(404)
        .json({ errors: { message: "Tour enquiry not found" } });
    }

    res.status(200).json(tourEnquiry);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch tour enquiry",
        details: error.message,
      },
    });
  }
};

// Update a tour enquiry
const updateTourEnquiry = async (req, res, next) => {
  const schema = z.object({
    budgetField: z.string().optional(),
    clientId: z.string().min(1, "Client ID cannot be blank."),
    tourBookingDetails: z
      .array(
        z.object({
          tourBookingDetailId: z.string().optional(), // Include ID for existing booking details
          day: z.number().min(1, "Day must be at least 1."),
          date: z.string().min(1, "Date cannot be blank."),
          description: z.string().min(1, "Description cannot be blank."),
          cityId: z.string().optional(),
        })
      )
      .optional(),
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
    branchId,
    tourId,
    bookingDetails,
    isJourney,
    isHotel,
    isVehicle,
    isPackage,
    enquiryStatus,
    tourBookingDetails = [],
  } = req.body;

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

    const result = await prisma.$transaction(async (tx) => {
      // First, delete familyFriends that are not in the new familyFriends array
      await tx.tourBookingDetails.deleteMany({
        where: {
          tourEnquiryId: parseInt(id, 10),
          id: {
            notIn: tourBookingDetails
              .filter((d) => parseInt(d.tourBookingDetailId))
              .map((d) => parseInt(d.tourBookingDetailId)), // Only keep existing friends in the list
          },
        },
      });

      // Now, proceed to update the client and upsert familyFriends
      const updatedTourEnquiry = await tx.tourEnquiry.update({
        where: { id: parseInt(id, 10) },
        data: {
          bookingDate: parseDate(bookingDate),
          journeyDate: parseDate(journeyDate),
          departureDate: parseDate(departureDate),
          budgetField: budgetField || null,
          clientId: parseInt(clientId, 10),
          numberOfAdults: numberOfAdults || null,
          numberOfChildren5To11: numberOfChildren5To11 || null,
          numberOfChildrenUnder5: numberOfChildrenUnder5 || null,
          ...(req.user.branchId
            ? {}
            : {
                branchId: branchId ? parseInt(branchId, 10) : null,
              }),
          tourId: tourId ? parseInt(tourId, 10) : null,
          bookingDetails: bookingDetails || null,
          isJourney: isJourney || false,
          isHotel: isHotel || false,
          isVehicle: isVehicle || false,
          isPackage: isPackage || false,
          enquiryStatus: enquiryStatus || null,
          tourBookingDetails: {
            upsert: tourBookingDetails
              .filter((detail) => !!parseInt(detail.tourBookingDetailId)) // Only existing friends
              .map((detail) => ({
                where: { id: parseInt(detail.detailId) },
                update: {
                  day: detail.day,
                  description: detail.description,
                  date: parseDate(detail.date),
                  cityId: detail.cityId ? parseInt(detail.cityId, 10) : null,
                },
                create: {
                  day: detail.day,
                  description: detail.description,
                  date: parseDate(detail.date),
                  cityId: detail.cityId ? parseInt(detail.cityId, 10) : null,
                },
              })),
            create: tourBookingDetails
              .filter((detail) => !parseInt(detail.tourBookingDetailId)) // Only new friends
              .map((detail) => ({
                day: detail.day,
                description: detail.description,
                date: parseDate(detail.date),
                cityId: detail.cityId ? parseInt(detail.cityId, 10) : null,
              })),
          },
        },
      });

      return {
        updatedTourEnquiry: updatedTourEnquiry,
      };
    });

    res.status(200).json(result);
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ errors: { message: "Tour enquiry not found" } });
    }
    return res.status(500).json({
      errors: {
        message: "Failed to update tour enquiry",
        details: error.message,
      },
    });
  }
};
//tour booking number generate.
// Delete a tour enquiry
const deleteTourEnquiry = async (req, res, next) => {
  const { id } = req.params;

  try {
    await prisma.tourEnquiry.delete({
      where: { id: parseInt(id, 10) },
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ errors: { message: "Tour enquiry not found" } });
    }
    res.status(500).json({
      errors: {
        message: "Failed to delete tour enquiry",
        details: error.message,
      },
    });
  }
};

module.exports = {
  getTourEnquiries,
  createTourEnquiry,
  getTourEnquiryById,
  deleteTourEnquiry,
  updateTourEnquiry,
};
