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
        // groupBooking: true,
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
    // total Member Allowed validation start

    const adults = numberOfAdults ? parseInt(numberOfAdults) : 0;
    const children5To11 = numberOfChildren5To11
      ? parseInt(numberOfChildren5To11)
      : 0;
    const childrenUnder5 = numberOfChildrenUnder5
      ? parseInt(numberOfChildrenUnder5)
      : 0;

    const totalMember = adults + children5To11 + childrenUnder5;

    // 1. Get GroupBooking and Tour
    const groupBooking = await prisma.groupBooking.findUnique({
      where: { id: parseInt(groupBookingId) },
      include: {
        tour: true,
        groupClients: {
          include: { groupClientMembers: true },
        },
      },
    });

    if (!groupBooking) {
      return res.status(404).json({ error: "Group booking not found." });
    }

    const maxTravelers = groupBooking.tour?.numberOfTravelers ?? 0;

    const existingTotalMembers = groupBooking.groupClients.reduce(
      (acc, client) => acc + (client.totalMember || 0),
      0
    );

    const overallCount = existingTotalMembers + totalMember;

    if (overallCount > maxTravelers) {
      return res.status(500).json({
        errors: {
          message: `Cannot add this booking. Maximum allowed travelers (${maxTravelers}) exceeded. Current count: ${overallCount}`,
        },
      });
    }

    // total Member Allowed validation end

    const result = await prisma.$transaction(async (tx) => {
      const newGroupClient = await tx.groupClient.create({
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
          isJourney: !!isJourney,
          isHotel: !!isHotel,
          isVehicle: !!isVehicle,
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

      // calculate total cost,aultes,childrens
      const updatedGroupBooking = await tx.groupBooking.update({
        where: { id: parseInt(groupBookingId) },
        data: {
          totalCost: await tx.groupClient
            .aggregate({
              _sum: { tourCost: true },
              where: { groupBookingId: parseInt(groupBookingId) },
            })
            .then((result) => result._sum.tourCost || new Prisma.Decimal(0)),

          totalNumberOfAdults: await tx.groupClient
            .aggregate({
              _sum: { numberOfAdults: true },
              where: { groupBookingId: parseInt(groupBookingId) },
            })
            .then((result) => result._sum.numberOfAdults || 0),

          totalNumberOfChildren5To11: await tx.groupClient
            .aggregate({
              _sum: { numberOfChildren5To11: true },
              where: { groupBookingId: parseInt(groupBookingId) },
            })
            .then((result) => result._sum.numberOfChildren5To11 || 0),

          totalNumberOfChildrenUnder5: await tx.groupClient
            .aggregate({
              _sum: { numberOfChildrenUnder5: true },
              where: { groupBookingId: parseInt(groupBookingId) },
            })
            .then((result) => result._sum.numberOfChildrenUnder5 || 0),

          totalGroupTravelers: await tx.groupClient
            .aggregate({
              _sum: {
                numberOfAdults: true,
                numberOfChildren5To11: true,
                numberOfChildrenUnder5: true,
              },
              where: { groupBookingId: parseInt(groupBookingId) },
            })
            .then(
              (result) =>
                (result._sum.numberOfAdults || 0) +
                (result._sum.numberOfChildren5To11 || 0) +
                (result._sum.numberOfChildrenUnder5 || 0)
            ),
        },
      });

      return { newGroupClient: newGroupClient };
    });

    res.status(201).json(result.newGroupClient);
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
        // groupBooking: true,
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

    // total Member Allowed validation start
    const adults = numberOfAdults ? parseInt(numberOfAdults) : 0;
    const children5To11 = numberOfChildren5To11
      ? parseInt(numberOfChildren5To11)
      : 0;
    const childrenBelow5 = numberOfChildrenUnder5
      ? parseInt(numberOfChildrenUnder5)
      : 0;
    const totalMember = adults + children5To11 + childrenBelow5;

    // 1. Lookup related groupBooking and tour
    const existingGroupClient = await prisma.groupClient.findUnique({
      where: { id: parseInt(groupClientId) },
      include: {
        groupBooking: {
          include: {
            tour: true,
            groupClients: {
              where: { NOT: { id: parseInt(groupClientId) } }, // exclude current client
            },
          },
        },
      },
    });

    if (!existingGroupClient) {
      return res.status(404).json({ error: "Group client booking not found." });
    }

    const groupBooking = existingGroupClient.groupBooking;
    const maxTravelers = groupBooking?.tour?.numberOfTravelers ?? 0;

    const existingTotalMembersFromOthers = groupBooking.groupClients.reduce(
      (acc, client) => acc + (client.totalMember || 0),
      0
    );

    const overallCount = existingTotalMembersFromOthers + totalMember;

    if (overallCount > maxTravelers) {
      return res.status(500).json({
        errors: {
          message: `Cannot update booking. Total travelers (${overallCount}) exceed allowed limit (${maxTravelers}).`,
        },
      });
    }
    // total Member Allowed validation end

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
          isJourney: !!isJourney,
          isHotel: !!isHotel,
          isVehicle: !!isVehicle,
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

      // ✅ Recalculate and update totalCost for the GroupBooking
      await tx.groupBooking.update({
        where: { id: groupBooking.id },
        data: {
          totalCost: await tx.groupClient
            .aggregate({
              _sum: { tourCost: true },
              where: { groupBookingId: groupBooking.id },
            })
            .then((res) => res._sum.tourCost || new Prisma.Decimal(0)),

          totalNumberOfAdults: await tx.groupClient
            .aggregate({
              _sum: { numberOfAdults: true },
              where: { groupBookingId: groupBooking.id },
            })
            .then((res) => res._sum.numberOfAdults || 0),

          totalNumberOfChildren5To11: await tx.groupClient
            .aggregate({
              _sum: { numberOfChildren5To11: true },
              where: { groupBookingId: groupBooking.id },
            })
            .then((res) => res._sum.numberOfChildren5To11 || 0),

          totalNumberOfChildrenUnder5: await tx.groupClient
            .aggregate({
              _sum: { numberOfChildrenUnder5: true },
              where: { groupBookingId: groupBooking.id },
            })
            .then((res) => res._sum.numberOfChildrenUnder5 || 0),

          totalGroupTravelers: await tx.groupClient
            .aggregate({
              _sum: {
                numberOfAdults: true,
                numberOfChildren5To11: true,
                numberOfChildrenUnder5: true,
              },
              where: { groupBookingId: groupBooking.id },
            })
            .then(
              (res) =>
                (res._sum.numberOfAdults || 0) +
                (res._sum.numberOfChildren5To11 || 0) +
                (res._sum.numberOfChildrenUnder5 || 0)
            ),
        },
      });

      return {
        updatedGroupClient: updatedGroupClient,
      };
    });

    res.status(200).json(result.updatedGroupClient);
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
