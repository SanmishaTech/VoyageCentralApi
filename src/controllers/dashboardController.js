const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors"); // For consistent error handling

const dayjs = require("dayjs");

const getUpcomingFollowUps = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const today = dayjs().startOf("day").toDate();
  const nextWeek = dayjs().add(7, "day").endOf("day").toDate();

  try {
    // Total count for pagination
    const totalFollowUps = await prisma.followUp.count({
      where: {
        nextFollowUpDate: {
          gte: today,
          lte: nextWeek,
        },
        booking: {
          agencyId: req.user.agencyId,
        },
      },
    });

    // Fetch paginated follow-ups
    const followUps = await prisma.followUp.findMany({
      where: {
        nextFollowUpDate: {
          gte: today,
          lte: nextWeek,
        },
        booking: {
          agencyId: req.user.agencyId,
        },
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        booking: {
          select: {
            bookingNumber: true,
          },
        },
      },
      orderBy: {
        nextFollowUpDate: "asc",
      },
      skip,
      take: limit,
    });

    // Format response
    const formattedFollowUps = followUps.map((fu) => ({
      bookingNumber: fu.booking.bookingNumber,
      nextFollowUpDate: dayjs(fu.nextFollowUpDate).format("YYYY-MM-DD"),
      remarks: fu.remarks,
      userName: fu.user.name,
    }));

    const totalPages = Math.ceil(totalFollowUps / limit);

    res.json({
      followUps: formattedFollowUps,
      page,
      limit,
      totalFollowUps,
      totalPages,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch upcoming follow-ups",
        details: error.message,
      },
    });
  }
};

module.exports = {
  getUpcomingFollowUps,
};
