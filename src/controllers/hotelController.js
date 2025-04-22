const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { z } = require('zod');
const validateRequest = require('../utils/validateRequest');
const createError = require('http-errors'); // For consistent error handling

// Get all hotels with pagination, sorting, and search
const getHotels = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || '';
  const sortBy = req.query.sortBy || 'id';
  const sortOrder = req.query.sortOrder === 'desc' ? 'desc' : 'asc';

  try {
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: 'User does not belong to any Agency' });
    }

    const whereClause = {
      agencyId: req.user.agencyId, // Add agency filter
      OR: [
        { hotelName: { contains: search } },
        // { hotelCity: { contains: search } },
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
        message: 'Failed to fetch hotels',
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
        .min(1, 'Hotel name cannot be left blank.')
        .max(100, 'Hotel name must not exceed 100 characters.'),
    })
    .superRefine(async (data, ctx) => {
      if (!req.user.agencyId) {
        return res
          .status(404)
          .json({ message: 'User does not belong to any Agency' });
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
          path: ['hotelName'],
          message: `Hotel with name ${data.hotelName} already exists.`,
        });
      }
    });

  const validationErrors = await validateRequest(schema, req.body, res);

  try {
    const newHotel = await prisma.hotel.create({
      data: {
        hotelName: req.body.hotelName,
        hotelAddressLine1: req.body.hotelAddressLine1,
        hotelAddressLine2: req.body.hotelAddressLine2,
        hotelAddressLine3: req.body.hotelAddressLine3,
        hotelPincode: req.body.hotelPincode,
        officeAddressLine1: req.body.officeAddressLine1,
        officeAddressLine2: req.body.officeAddressLine2,
        officeAddressLine3: req.body.officeAddressLine3,
        officePincode: req.body.officePincode,
        contactPerson: req.body.contactPerson,
        hotelContactNo1: req.body.hotelContactNo1,
        hotelContactNo2: req.body.hotelContactNo2,
        officeContactNo1: req.body.officeContactNo1,
        officeContactNo2: req.body.officeContactNo2,
        email1: req.body.email1,
        email2: req.body.email2,
        website: req.body.website,
        panNumber: req.body.panNumber,

        bankName1: req.body.bankName1,
        bankAccountNumber1: req.body.bankAccountNumber1,
        branch1: req.body.branch1,
        beneficiaryName1: req.body.beneficiaryName1,
        ifsc_code1: req.body.ifsc_code1,
        swiftCode1: req.body.swiftCode1,

        bankName2: req.body.bankName2,
        bankAccountNumber2: req.body.bankAccountNumber2,
        branch2: req.body.branch2,
        beneficiaryName2: req.body.beneficiaryName2,
        ifsc_code2: req.body.ifsc_code2,
        swiftCode2: req.body.swiftCode2,

        agencyId: req.user.agencyId,
        hotelCountryId: parseInt(req.body.hotelCountry),
        hotelStateId: parseInt(req.body.hotelState),
        hotelCityId: parseInt(req.body.hotelCity),
        officeCountryId: parseInt(req.body.officeCountry),
        officeStateId: parseInt(req.body.officeState),
        officeCityId: parseInt(req.body.officeCity),
      },
    });

    res.status(201).json(newHotel);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: 'Failed to create hotel',
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
      return res.status(404).json({ errors: { message: 'Hotel not found' } });
    }

    res.status(200).json(hotel);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: 'Failed to fetch hotel',
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
        .min(1, 'Hotel name cannot be left blank.')
        .max(100, 'Hotel name must not exceed 100 characters.'),
    })
    .superRefine(async (data, ctx) => {
      if (!req.user.agencyId) {
        return res
          .status(404)
          .json({ message: 'User does not belong to any Agency' });
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
          path: ['hotelName'],
          message: `Hotel with name ${data.hotelName} already exists.`,
        });
      }
    });

  const validationErrors = await validateRequest(schema, req.body, res);

  const { id } = req.params;

  try {
    const updatedHotel = await prisma.hotel.update({
      where: { id: parseInt(id, 10) },
      data: {
        hotelName: req.body.hotelName,
        hotelAddressLine1: req.body.hotelAddressLine1,
        hotelAddressLine2: req.body.hotelAddressLine2,
        hotelAddressLine3: req.body.hotelAddressLine3,
        hotelPincode: req.body.hotelPincode,
        officeAddressLine1: req.body.officeAddressLine1,
        officeAddressLine2: req.body.officeAddressLine2,
        officeAddressLine3: req.body.officeAddressLine3,
        officePincode: req.body.officePincode,
        contactPerson: req.body.contactPerson,
        hotelContactNo1: req.body.hotelContactNo1,
        hotelContactNo2: req.body.hotelContactNo2,
        officeContactNo1: req.body.officeContactNo1,
        officeContactNo2: req.body.officeContactNo2,
        email1: req.body.email1,
        email2: req.body.email2,
        website: req.body.website,
        panNumber: req.body.panNumber,

        bankName1: req.body.bankName1,
        bankAccountNumber1: req.body.bankAccountNumber1,
        branch1: req.body.branch1,
        beneficiaryName1: req.body.beneficiaryName1,
        ifsc_code1: req.body.ifsc_code1,
        swiftCode1: req.body.swiftCode1,

        bankName2: req.body.bankName2,
        bankAccountNumber2: req.body.bankAccountNumber2,
        branch2: req.body.branch2,
        beneficiaryName2: req.body.beneficiaryName2,
        ifsc_code2: req.body.ifsc_code2,
        swiftCode2: req.body.swiftCode2,

        hotelCountryId: parseInt(req.body.hotelCountry),
        hotelStateId: parseInt(req.body.hotelState),
        hotelCityId: parseInt(req.body.hotelCity),
        officeCountryId: parseInt(req.body.officeCountry),
        officeStateId: parseInt(req.body.officeState),
        officeCityId: parseInt(req.body.officeCity),
      },
    });

    res.status(200).json(updatedHotel);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ errors: { message: 'Hotel not found' } });
    }
    return res.status(500).json({
      errors: {
        message: 'Failed to update hotel',
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
    if (error.code === 'P2025') {
      return res.status(404).json({ errors: { message: 'Hotel not found' } });
    }
    res.status(500).json({
      errors: {
        message: 'Failed to delete hotel',
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
        .json({ message: 'User does not belong to any Agency' });
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
        message: 'Failed to fetch hotels',
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
