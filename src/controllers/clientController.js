const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { z } = require('zod');
const validateRequest = require('../utils/validateRequest');
const createError = require('http-errors'); // For consistent error handling

// Get all clients with pagination, sorting, and search
const getClients = async (req, res, next) => {
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
        { clientName: { contains: search } },
        { mobile1: { contains: search } },
        { email: { contains: search } },
        { address1: { contains: search } },
      ],
    };

    const clients = await prisma.client.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    const totalClients = await prisma.client.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalClients / limit);

    res.json({
      clients,
      page,
      totalPages,
      totalClients,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: 'Failed to fetch clients',
        details: error.message,
      },
    });
  }
};

// Create a new client
const createClient = async (req, res, next) => {
  const schema = z.object({
    clientName: z
      .string()
      .min(1, 'Client name cannot be left blank.')
      .max(100, 'Client name must not exceed 100 characters.'),
    familyFriends: z
      .array(
        z.object({
          name: z.string().min(1, 'Name cannot be blank.'),
        })
      )
      .optional(),
  });

  const validationErrors = await validateRequest(schema, req.body, res);

  try {
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: 'User does not belong to any Agency' });
    }
    const {
      clientName,
      gender,
      email,
      dateOfBirth,
      marriageDate,
      referBy,
      address1,
      address2,
      stateId,
      cityId,
      pincode,
      mobile1,
      mobile2,
      getSelection,
      passportNo,
      panNo,
      aadharNo,
      familyFriends,
    } = req.body;

    const newClient = await prisma.client.create({
      data: {
        clientName,
        agencyId: req.user.agencyId,
        gender,
        email,
        dateOfBirth,
        marriageDate,
        referBy,
        address1,
        address2,
        stateId: parseInt(stateId, 10),
        cityId: parseInt(cityId, 10),
        pincode,
        mobile1,
        mobile2,
        getSelection,
        passportNo,
        panNo,
        aadharNo,
        familyFriends: {
          create: familyFriends || [],
        },
      },
    });

    res.status(201).json(newClient);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: 'Failed to create client',
        details: error.message,
      },
    });
  }
};

// Get a client by ID
const getClientById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const client = await prisma.client.findFirst({
      where: {
        AND: [
          { id: parseInt(id, 10) },
          { agencyId: parseInt(req.user.agencyId) },
        ],
      },
      include: {
        familyFriends: true, // Include familyFriends in the response
      },
    });

    if (!client) {
      return res.status(404).json({ errors: { message: 'Client not found' } });
    }

    res.status(200).json(client);
  } catch (error) {
    res.status(500).json({
      errors: {
        message: 'Failed to fetch client',
        details: error.message,
      },
    });
  }
};

// Update a client
const updateClient = async (req, res, next) => {
  const schema = z.object({
    clientName: z
      .string()
      .min(1, 'Client name cannot be left blank.')
      .max(100, 'Client name must not exceed 100 characters.'),
    familyFriends: z
      .array(
        z.object({
          id: z.number().optional(), // Include ID for existing familyFriends
          name: z.string().min(1, 'Name cannot be blank.'),
          gender: z.string().optional(),
          relation: z.string().optional(),
          aadharNo: z.string().optional(),
          dateOfBirth: z.string().optional(),
          anniversaryDate: z.string().optional(),
          foodType: z.string().optional(),
          mobile: z.string().optional(),
          email: z.string().email('Invalid email address').optional(),
        })
      )
      .optional(),
  });

  const validationErrors = await validateRequest(schema, req.body, res);

  const { id } = req.params;
  const {
    clientName,
    gender,
    email,
    dateOfBirth,
    marriageDate,
    referBy,
    address1,
    address2,
    stateId,
    cityId,
    pincode,
    mobile1,
    mobile2,
    getSelection,
    passportNo,
    panNo,
    aadharNo,
    familyFriends,
  } = req.body;
  try {
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: 'User does not belong to any Agency' });
    }
    // First, delete familyFriends that are not in the new familyFriends array
    await prisma.familyFriend.deleteMany({
      where: {
        clientId: parseInt(id, 10),
        id: {
          notIn: familyFriends.filter((f) => f.id).map((f) => f.id), // Only keep existing friends in the list
        },
      },
    });

    // Now, proceed to update the client and upsert familyFriends
    const updatedClient = await prisma.client.update({
      where: { id: parseInt(id, 10) },
      data: {
        clientName,
        gender,
        email,
        dateOfBirth,
        marriageDate,
        referBy,
        address1,
        address2,
        stateId: parseInt(stateId, 10),
        cityId: parseInt(cityId, 10),
        pincode,
        mobile1,
        mobile2,
        getSelection,
        passportNo,
        panNo,
        aadharNo,
        familyFriends: {
          upsert: familyFriends
            .filter((friend) => !!friend.id) // Only existing friends
            .map((friend) => ({
              where: { id: friend.id },
              update: {
                name: friend.name,
                gender: friend.gender,
                relation: friend.relation,
                aadharNo: friend.aadharNo,
                dateOfBirth: friend.dateOfBirth,
                anniversaryDate: friend.anniversaryDate,
                foodType: friend.foodType,
                mobile: friend.mobile,
                email: friend.email,
              },
              create: {
                name: friend.name,
                gender: friend.gender,
                relation: friend.relation,
                aadharNo: friend.aadharNo,
                dateOfBirth: friend.dateOfBirth,
                anniversaryDate: friend.anniversaryDate,
                foodType: friend.foodType,
                mobile: friend.mobile,
                email: friend.email,
              },
            })),
          create: familyFriends
            .filter((friend) => !friend.id) // Only new friends
            .map((friend) => ({
              name: friend.name,
              gender: friend.gender,
              relation: friend.relation,
              aadharNo: friend.aadharNo,
              dateOfBirth: friend.dateOfBirth,
              anniversaryDate: friend.anniversaryDate,
              foodType: friend.foodType,
              mobile: friend.mobile,
              email: friend.email,
            })),
        },
      },
    });

    res.status(200).json(updatedClient);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ errors: { message: 'Client not found' } });
    }
    return res.status(500).json({
      errors: {
        message: 'Failed to update client',
        details: error.message,
      },
    });
  }
};

// Delete a client
const deleteClient = async (req, res, next) => {
  const { id } = req.params;

  try {
    await prisma.client.delete({
      where: { id: parseInt(id, 10) },
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ errors: { message: 'Client not found' } });
    }
    res.status(500).json({
      errors: {
        message: 'Failed to delete client',
        details: error.message,
      },
    });
  }
};

module.exports = {
  getClients,
  createClient,
  getClientById,
  updateClient,
  deleteClient,
};
