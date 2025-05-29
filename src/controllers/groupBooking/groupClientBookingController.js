const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const dayjs = require("dayjs");
const { z } = require("zod");
const validateRequest = require("../../utils/validateRequest");

// Helper to parse date
const parseDate = (value) => {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  return dayjs(value).isValid() ? new Date(value) : undefined;
};

// Get all group client bookings with pagination
const getGroupClientByGroupBookingId = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const { groupBookingId } = req.params;
  try {
    const whereClause = {
      groupBookingId: parseInt(groupBookingId),
      OR: [{ notes: { contains: search } }],
    };

    const groupClients = await prisma.groupClient.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { id: "desc" },
      include: {
        client: true,
        groupBooking: true,
        groupClientMembers: true,
      },
    });

    const totalGroupClients = await prisma.groupClient.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalGroupClients / limit);

    res.json({
      groupClients,
      page,
      totalPages,
      totalGroupClients,
    });
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch group client bookings",
        details: error.message,
      },
    });
  }
};

// Create a new group client booking
const createGroupClientBooking = async (req, res) => {
  const schema = z.object({
    bookingDate: z.string().min("Booking date is required"),
    isJourney: z
      .string()
      .refine((val) => val === "true" || val === "false", {
        message: "isPrivate must be either 'true' or 'false' as a string.",
      })
      .transform((val) => val === "true"),
    isHotel: z
      .string()
      .refine((val) => val === "true" || val === "false", {
        message: "isPrivate must be either 'true' or 'false' as a string.",
      })
      .transform((val) => val === "true"),
    isVehicle: z
      .string()
      .refine((val) => val === "true" || val === "false", {
        message: "isPrivate must be either 'true' or 'false' as a string.",
      })
      .transform((val) => val === "true"),
  });
  const { groupBookingId } = req.params;
  const validationResult = await validateRequest(schema, req.body, res);

  try {
    const {
      clientId,
      bookingDate,
      numberOfAdults,
      numberOfChildren5To11,
      numberOfChildrenUnder5,
      tourCost,
      notes,
      isJourney,
      isHotel,
      isVehicle,
      groupClientMembers = [],
    } = req.body;
    const adults = numberOfAdults ? parseInt(numberOfAdults) : null;
    const children5To11 = numberOfChildren5To11
      ? parseInt(numberOfChildren5To11)
      : null;
    const childrenBelow5 = numberOfChildrenUnder5
      ? parseInt(numberOfChildrenUnder5)
      : null;
    const totalMember = adults + children5To11 + childrenBelow5;

    const newGroupClient = await prisma.groupClient.create({
      data: {
        groupBookingId: parseInt(groupBookingId),
        clientId: parseInt(clientId),
        bookingDate: bookingDate ? parseDate(bookingDate) : null,
        numberOfAdults: numberOfAdults ? parseInt(numberOfAdults) : null,
        numberOfChildren5To11: numberOfChildren5To11
          ? parseInt(numberOfChildren5To11)
          : null,
        numberOfChildrenUnder5: numberOfChildrenUnder5
          ? parseInt(numberOfChildrenUnder5)
          : null,
        totalMember: parseInt(totalMember),
        tourCost: tourCost ? new Prisma.Decimal(tourCost) : null,
        notes,
        isJourney: isJourney,
        isHotel: isHotel,
        isVehicle: isVehicle,
        groupClientMembers: {
          create: (groupClientMembers || []).map((member) => ({
            name: member.name || null,
            gender: member.gender || null,
            aadharNo: member.aadharNo || null,
            relation: member.relation || null,
            dateOfBirth: member.dateOfBirth
              ? parseDate(member.dateOfBirth)
              : null,
            anniversaryDate: member.anniversaryDate
              ? parseDate(member.anniversaryDate)
              : null,
            foodType: member.foodType || null,
            mobile: member.mobile || null,
            email: member.email || null,
            passportNumber: member.passportNumber || null,
            panNumber: member.panNumber || null,
          })),
        },
      },
    });

    res.status(201).json(newGroupClient);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to create group client booking",
        details: error.message,
      },
    });
  }
};

// Get a group client booking by ID
const getGroupClientBookingById = async (req, res) => {
  const { groupClientId } = req.params;
  try {
    const groupClient = await prisma.groupClient.findUnique({
      where: { id: parseInt(groupClientId, 10) },
      include: {
        client: true,
        groupBooking: true,
        groupClientMembers: true,
      },
    });
    if (!groupClient) {
      return res
        .status(404)
        .json({ errors: { message: "Group client booking not found" } });
    }
    res.status(200).json(groupClient);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch group client booking",
        details: error.message,
      },
    });
  }
};

// Update a group client booking
const updateGroupClientBooking = async (req, res) => {
  const schema = z.object({
    bookingDate: z.string().min("Booking date is required"),
    isJourney: z
      .string()
      .refine((val) => val === "true" || val === "false", {
        message: "isPrivate must be either 'true' or 'false' as a string.",
      })
      .transform((val) => val === "true"),
    isHotel: z
      .string()
      .refine((val) => val === "true" || val === "false", {
        message: "isPrivate must be either 'true' or 'false' as a string.",
      })
      .transform((val) => val === "true"),
    isVehicle: z
      .string()
      .refine((val) => val === "true" || val === "false", {
        message: "isPrivate must be either 'true' or 'false' as a string.",
      })
      .transform((val) => val === "true"),
  });

  const validationResult = await validateRequest(schema, req.body, res);
  const { groupClientId } = req.params;

  try {
    const {
      clientId,
      bookingDate,
      numberOfAdults,
      numberOfChildren5To11,
      numberOfChildrenUnder5,
      tourCost,
      notes,
      isJourney,
      isHotel,
      isVehicle,
      groupClientMembers = [],
    } = req.body;

    const adults = numberOfAdults ? parseInt(numberOfAdults) : null;
    const children5To11 = numberOfChildren5To11
      ? parseInt(numberOfChildren5To11)
      : null;
    const childrenBelow5 = numberOfChildrenUnder5
      ? parseInt(numberOfChildrenUnder5)
      : null;
    const totalMember = adults + children5To11 + childrenBelow5;

    const result = await prisma.$transaction(async (tx) => {
      // First, delete familymembers that are not in the new familyFriends array
      await tx.groupClientMember.deleteMany({
        where: {
          groupClientId: parseInt(groupClientId, 10),
          id: {
            notIn: groupClientMembers
              .filter((d) => parseInt(d.groupClientMemberId))
              .map((d) => parseInt(d.groupClientMemberId)), // Only keep existing friends in the list
          },
        },
      });

      // Update group client booking
      const updatedGroupClient = await tx.groupClient.update({
        where: { id: parseInt(groupClientId, 10) },
        data: {
          clientId: parseInt(clientId),
          bookingDate: bookingDate ? parseDate(bookingDate) : null,
          numberOfAdults: numberOfAdults ? parseInt(numberOfAdults) : null,
          numberOfChildren5To11: numberOfChildren5To11
            ? parseInt(numberOfChildren5To11)
            : null,
          numberOfChildrenUnder5: numberOfChildrenUnder5
            ? parseInt(numberOfChildrenUnder5)
            : null,
          totalMember: parseInt(totalMember),
          tourCost: tourCost ? new Prisma.Decimal(tourCost) : null,
          notes,
          isJourney: isJourney,
          isHotel: isHotel,
          isVehicle: isVehicle,
          groupClientMembers: {
            upsert: groupClientMembers
              .filter((member) => !!parseInt(member.groupClientMemberId)) // Only existing members
              .map((member) => ({
                where: { id: parseInt(member.groupClientMemberId) },
                update: {
                  name: member.name,
                  gender: member.gender || null,
                  relation: member.relation || null,
                  aadharNo: member.aadharNo || null,
                  dateOfBirth: parseDate(member.dateOfBirth),
                  anniversaryDate: parseDate(member.anniversaryDate),
                  foodType: member.foodType || null,
                  mobile: member.mobile || null,
                  email: member.email || null,
                  passportNumber: member.passportNumber || null,
                  panNumber: member.panNumber || null,
                },
                create: {
                  name: member.name,
                  gender: member.gender || null,
                  relation: member.relation || null,
                  aadharNo: member.aadharNo || null,
                  dateOfBirth: parseDate(member.dateOfBirth),
                  anniversaryDate: parseDate(member.anniversaryDate),
                  foodType: member.foodType || null,
                  mobile: member.mobile || null,
                  email: member.email || null,
                  passportNumber: member.passportNumber || null,
                  panNumber: member.panNumber || null,
                },
              })),
            create: groupClientMembers
              .filter((member) => !parseInt(member.groupClientMemberId)) // Only new members
              .map((member) => ({
                name: member.name,
                gender: member.gender || null,
                relation: member.relation || null,
                aadharNo: member.aadharNo || null,
                dateOfBirth: parseDate(member.dateOfBirth),
                anniversaryDate: parseDate(member.anniversaryDate),
                foodType: member.foodType || null,
                mobile: member.mobile || null,
                email: member.email || null,
                passportNumber: member.passportNumber || null,
                panNumber: member.panNumber || null,
              })),
          },
        },
      });
      return {
        updatedGroupClient: updatedGroupClient,
      };
    });

    res.status(200).json(updatedGroupClient);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to update group client booking",
        details: error.message,
      },
    });
  }
};

// Delete a group client booking
const deleteGroupClientBooking = async (req, res) => {
  const { groupClientId } = req.params;
  try {
    await prisma.groupClient.delete({
      where: { id: parseInt(groupClientId, 10) },
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
            "Cannot delete this Group Client because it is referenced in related data. Please remove those first.",
        },
      });
    }
    res.status(500).json({
      errors: {
        message: "Failed to delete group client booking",
        details: error.message,
      },
    });
  }
};

module.exports = {
  getGroupClientByGroupBookingId,
  createGroupClientBooking,
  getGroupClientBookingById,
  updateGroupClientBooking,
  deleteGroupClientBooking,
};
