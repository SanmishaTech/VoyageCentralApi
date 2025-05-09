const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const validateRequest = require("../utils/validateRequest");
const createError = require("http-errors");

// Get agents with pagination, sorting, and search
const getAgents = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

  try {
    // Filter by agencyId from the logged-in user
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: "User does not belong to any Agency" });
    }
    const whereClause = {
      agencyId: req.user.agencyId,
      OR: [
        { agentName: { contains: search } },
        { city: { cityName: { contains: search } } },
        { mobile1: { contains: search } },
        { email1: { contains: search } },
      ],
    };

    const agents = await prisma.agent.findMany({
      where: whereClause,
      include: {
        city: true,
      },
      skip,
      take: limit,
      //   orderBy: { [sortBy]: sortOrder },
      orderBy:
        sortBy === "cityName"
          ? { city: { cityName: sortOrder } }
          : { [sortBy]: sortOrder },
    });

    const totalAgents = await prisma.agent.count({ where: whereClause });
    const totalPages = Math.ceil(totalAgents / limit);

    res.json({
      agents,
      page,
      limit,
      totalPages,
      totalAgents,
    });
  } catch (error) {
    console.error("Error fetching agents:", error);
    return res.status(500).json({
      errors: {
        message: "Failed to fetch agents",
        details: error.message,
      },
    });
  }
};

// Create a new agent
const createAgent = async (req, res, next) => {
  const schema = z
    .object({
      agentName: z.string().min(1, "Agent name is required."),
    })
    .superRefine(async (data, ctx) => {
      if (!req.user.agencyId) {
        return res
          .status(404)
          .json({ message: "User does not belong to any Agency" });
      }
      const existingAgent = await prisma.agent.findFirst({
        where: {
          AND: [
            { agentName: data.agentName },
            { agencyId: parseInt(req.user.agencyId) },
          ],
        },
      });

      if (existingAgent) {
        ctx.addIssue({
          path: ["agentName"],
          message: `Agent with name ${data.agentName} already exists.`,
        });
      }
    });

  const validationErrors = await validateRequest(schema, req.body, res);

  try {
    // Destructure the desired fields from req.body
    const {
      agentName,
      addressLine1,
      addressLine2,
      addressLine3,
      countryId,
      stateId,
      cityId,
      pincode,
      contactPersonName,
      mobile1,
      mobile2,
      email1,
      email2,
      websiteName,
      panNumber,
      landlineNumber1,
      landlineNumber2,
      bank1Id,
      bankAccountNumber1,
      branch1,
      beneficiaryName1,
      ifscCode1,
      swiftCode1,
      bank2Id,
      bankAccountNumber2,
      branch2,
      beneficiaryName2,
      ifscCode2,
      swiftCode2,
    } = req.body;

    const newAgent = await prisma.agent.create({
      data: {
        agencyId: parseInt(req.user.agencyId),
        agentName,
        addressLine1,
        addressLine2: addressLine2 || null,
        addressLine3: addressLine3 || null,
        countryId: parseInt(countryId),
        stateId: parseInt(stateId),
        cityId: parseInt(cityId),
        pincode: pincode || null,
        contactPersonName,
        mobile1,
        mobile2: mobile2 || null,
        email1,
        email2: email2 || null,
        websiteName: websiteName || null,
        panNumber,
        landlineNumber1: landlineNumber1 || null,
        landlineNumber2: landlineNumber2 || null,
        bank1Id: parseInt(bank1Id),
        bankAccountNumber1,
        branch1,
        beneficiaryName1,
        ifscCode1,
        swiftCode1,
        bank2Id: bank2Id ? parseInt(bank2Id) : null,
        bankAccountNumber2: bankAccountNumber2 || null,
        branch2: branch2 || null,
        beneficiaryName2: beneficiaryName2 || null,
        ifscCode2: ifscCode2 || null,
        swiftCode2: swiftCode2 || null,
      },
    });

    res.status(201).json(newAgent);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to create agent",
        details: error.message,
      },
    });
  }
};

// Get an agent by ID
const getAgentById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const agent = await prisma.agent.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!agent) {
      return res.status(404).json({ errors: { message: "Agent not found" } });
    }

    res.status(200).json(agent);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch agent",
        details: error.message,
      },
    });
  }
};

// Update an agent
const updateAgent = async (req, res, next) => {
  const schema = z
    .object({
      agentName: z.string().min(1, "Agent name is required."),
    })
    .superRefine(async (data, ctx) => {
      if (!req.user.agencyId) {
        return res
          .status(404)
          .json({ message: "User does not belong to any Agency" });
      }
      const { id } = req.params;

      const existingAgent = await prisma.agent.findFirst({
        where: {
          AND: [
            { agentName: data.agentName },
            { agencyId: parseInt(req.user.agencyId) },
          ],
        },
        select: { id: true },
      });

      if (existingAgent && existingAgent.id !== parseInt(id)) {
        ctx.addIssue({
          path: ["agentName"],
          message: `Agent with name ${data.agentName} already exists.`,
        });
      }
    });

  const validationErrors = await validateRequest(schema, req.body, res);
  const { id } = req.params;

  try {
    const {
      agentName,
      addressLine1,
      addressLine2,
      addressLine3,
      countryId,
      stateId,
      cityId,
      pincode,
      contactPersonName,
      mobile1,
      mobile2,
      email1,
      email2,
      websiteName,
      panNumber,
      landlineNumber1,
      landlineNumber2,
      bank1Id,
      bankAccountNumber1,
      branch1,
      beneficiaryName1,
      ifscCode1,
      swiftCode1,
      bank2Id,
      bankAccountNumber2,
      branch2,
      beneficiaryName2,
      ifscCode2,
      swiftCode2,
    } = req.body;

    const updatedAgent = await prisma.agent.update({
      where: { id: parseInt(id, 10) },
      data: {
        agentName,
        addressLine1,
        addressLine2: addressLine2 || null,
        addressLine3: addressLine3 || null,
        countryId: parseInt(countryId),
        stateId: parseInt(stateId),
        cityId: parseInt(cityId),
        pincode: pincode || null,
        contactPersonName,
        mobile1,
        mobile2: mobile2 || null,
        email1,
        email2: email2 || null,
        websiteName: websiteName || null,
        panNumber,
        landlineNumber1: landlineNumber1 || null,
        landlineNumber2: landlineNumber2 || null,
        bank1Id: parseInt(bank1Id),
        bankAccountNumber1,
        branch1,
        beneficiaryName1,
        ifscCode1,
        swiftCode1,
        bank2Id: bank2Id ? parseInt(bank2Id) : null,
        bankAccountNumber2: bankAccountNumber2 || null,
        branch2: branch2 || null,
        beneficiaryName2: beneficiaryName2 || null,
        ifscCode2: ifscCode2 || null,
        swiftCode2: swiftCode2 || null,
      },
    });

    res.status(200).json(updatedAgent);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "Agent not found" } });
    }
    return res.status(500).json({
      errors: {
        message: "Failed to update agent",
        details: error.message,
      },
    });
  }
};

// Delete an agent
const deleteAgent = async (req, res, next) => {
  const { id } = req.params;

  try {
    await prisma.agent.delete({
      where: { id: parseInt(id, 10) },
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "Agent not found" } });
    }
    res.status(500).json({
      errors: {
        message: "Failed to delete agent",
        details: error.message,
      },
    });
  }
};

// Get all agents (without pagination)
const getAllAgents = async (req, res, next) => {
  try {
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: "User does not belong to any Agency" });
    }

    const agents = await prisma.agent.findMany({
      where: { agencyId: req.user.agencyId },
    });

    res.status(200).json(agents);
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch agents",
        details: error.message,
      },
    });
  }
};

module.exports = {
  getAgents,
  createAgent,
  getAgentById,
  updateAgent,
  deleteAgent,
  getAllAgents,
};
