const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const dayjs = require("dayjs");

const parseDate = (value) => {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  return dayjs(value).isValid() ? new Date(value) : undefined;
};

const createTourMember = async (req, res) => {
  const { id: bookingId } = req.params;
  const { tourMembers } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const newTourMembers = await tx.tourMember.createMany({
        data: tourMembers.map((member) => ({
          bookingId: parseInt(bookingId, 10),
          name: member.name || null,
          gender: member.gender || null,
          aadharNo: member.aadharNo || null,
          relation: member.relation || null,
          dateOfBirth: parseDate(member.dateOfBirth),
          anniversaryDate: parseDate(member.anniversaryDate),
          foodType: member.foodType || null,
          mobile: member.mobile || null,
          email: member.email || null,
        })),
      });

      return {
        newTourMembers: newTourMembers,
      };
    });

    res.status(201).json(result.newTourMembers);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to create tour members",
        details: error.message,
      },
    });
  }
};

// Get a tour member by ID
const getTourMemberById = async (req, res) => {
  const { id } = req.params;
  try {
    const tourMember = await prisma.tourMember.findUnique({
      where: { id: parseInt(id, 10) },
    });
    if (!tourMember) {
      return res
        .status(404)
        .json({ errors: { message: "Tour member not found" } });
    }
    res.status(200).json(tourMember);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch tour member",
        details: error.message,
      },
    });
  }
};

// // Update a tour member
// const updateTourMember = async (req, res) => {
//   const { id } = req.params;
//   const { tourMembers } = req.body;

//   try {
//     const result = await prisma.$transaction(async (tx) => {
//       // First, delete familyFriends that are not in the new familyFriends array
//       await tx.tourMember.deleteMany({
//         where: {
//           bookingId: parseInt(id, 10),
//           id: {
//             notIn: tourMembers
//               .filter((t) => parseInt(t.tourMemberId))
//               .map((t) => parseInt(t.tourMemberId)), // Only keep existing friends in the list
//           },
//         },
//       });

//       // Upsert existing tour members
//       for (const member of tourMembers.filter((m) =>
//         parseInt(m.tourMemberId)
//       )) {
//         await tx.tourMember.update({
//           where: { id: parseInt(member.tourMemberId) },
//           data: {
//             name: member.name || null,
//             gender: member.gender || null,
//             aadharNo: member.aadharNo || null,
//             relation: member.relation || null,
//             dateOfBirth: parseDate(member.dateOfBirth),
//             anniversaryDate: parseDate(member.anniversaryDate),
//             foodType: member.foodType || null,
//             mobile: member.mobile || null,
//             email: member.email || null,
//           },
//         });
//       }

//       // Create new tour members (those without an ID)
//       await tx.tourMember.createMany({
//         data: tourMembers
//           .filter((m) => !parseInt(m.tourMemberId)) // New members
//           .map((member) => ({
//             bookingId: parseInt(id, 10),
//             name: member.name || null,
//             gender: member.gender || null,
//             aadharNo: member.aadharNo || null,
//             relation: member.relation || null,
//             dateOfBirth: parseDate(member.dateOfBirth),
//             anniversaryDate: parseDate(member.anniversaryDate),
//             foodType: member.foodType || null,
//             mobile: member.mobile || null,
//             email: member.email || null,
//           })),
//       });

//       return {
//         message: "Tour members updated successfully",
//       };
//     });

//     return res.status(200).json(result.message);
//   } catch (error) {
//     if (error.code === "P2025") {
//       return res
//         .status(404)
//         .json({ errors: { message: "Tour member not found" } });
//     }
//     res.status(500).json({
//       errors: {
//         message: "Failed to update tour member",
//         details: error.message,
//       },
//     });
//   }
// };

// Update a tour member
const updateTourMember = async (req, res) => {
  const { id: tour_member_id } = req.params;
  const {
    name,
    gender,
    aadharNo,
    relation,
    dateOfBirth,
    anniversaryDate,
    foodType,
    mobile,
    email,
  } = req.body;

  try {
    const updatedTourMember = await prisma.tourMember.update({
      where: { id: parseInt(tour_member_id) },
      data: {
        name: name || null,
        gender: gender || null,
        aadharNo: aadharNo || null,
        relation: relation || null,
        dateOfBirth: parseDate(dateOfBirth),
        anniversaryDate: parseDate(anniversaryDate),
        foodType: foodType || null,
        mobile: mobile || null,
        email: email || null,
      },
    });

    return res.status(200).json(updatedTourMember);
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ errors: { message: "Tour member not found" } });
    }
    res.status(500).json({
      errors: {
        message: "Failed to update tour member",
        details: error.message,
      },
    });
  }
};

// Get all tour members for a given booking ID
const getAllTourMembersByBookingId = async (req, res) => {
  const { id } = req.params; // 'id' is the bookingId
  try {
    const tourMembers = await prisma.tourMember.findMany({
      where: { bookingId: parseInt(id, 10) },
      orderBy: { id: "desc" },
    });
    res.status(200).json({ tourMembers });
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch tour members",
        details: error.message,
      },
    });
  }
};

// Delete a tour member
const deleteTourMember = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.tourMember.delete({
      where: { id: parseInt(id, 10) },
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ errors: { message: "Tour member not found" } });
    }
    res.status(500).json({
      errors: {
        message: "Failed to delete tour member",
        details: error.message,
      },
    });
  }
};

module.exports = {
  createTourMember,
  getTourMemberById,
  updateTourMember,
  getAllTourMembersByBookingId,
  deleteTourMember,
};
