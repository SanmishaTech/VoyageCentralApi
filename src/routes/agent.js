const express = require("express");
const router = express.Router();
const {
  getAgents,
  createAgent,
  getAgentById,
  updateAgent,
  deleteAgent,
  getAllAgents,
} = require("../controllers/agentController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: Agents
 *   description: Agent management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Agent:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         agencyId:
 *           type: integer
 *         agentName:
 *           type: string
 *         addressLine1:
 *           type: string
 *         addressLine2:
 *           type: string
 *         addressLine3:
 *           type: string
 *         countryId:
 *           type: integer
 *         stateId:
 *           type: integer
 *         cityId:
 *           type: integer
 *         pincode:
 *           type: string
 *         contactPersonName1:
 *           type: string
 *         mobile1:
 *           type: string
 *         mobile2:
 *           type: string
 *         email1:
 *           type: string
 *         email2:
 *           type: string
 *         websiteName:
 *           type: string
 *         panNumber:
 *           type: string
 *         landlineNumber1:
 *           type: string
 *         landlineNumber2:
 *           type: string
 *         bank1Id:
 *           type: integer
 *         bankAccountNumber1:
 *           type: string
 *         branch1:
 *           type: string
 *         beneficiaryName1:
 *           type: string
 *         ifscCode1:
 *           type: string
 *         swiftCode1:
 *           type: string
 *         bank2Id:
 *           type: integer
 *         bankAccountNumber2:
 *           type: string
 *         branch3:
 *           type: string
 *         beneficiaryName3:
 *           type: string
 *         ifscCode2:
 *           type: string
 *         swiftCode2:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /agents:
 *   get:
 *     summary: Get agents with pagination, search, and sorting
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Current page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of agents per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term (agent name, mobile, or email)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: id
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of agents with pagination metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 agents:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Agent'
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalAgents:
 *                   type: integer
 *       500:
 *         description: Failed to fetch agents
 */
router.get("/", auth, acl("agents.read"), getAgents);

/**
 * @swagger
 * /agents:
 *   post:
 *     summary: Create a new agent
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Agent object to be created
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               agencyId:
 *                 type: integer
 *               agentName:
 *                 type: string
 *               addressLine1:
 *                 type: string
 *               addressLine2:
 *                 type: string
 *               addressLine3:
 *                 type: string
 *               countryId:
 *                 type: integer
 *               stateId:
 *                 type: integer
 *               cityId:
 *                 type: integer
 *               pincode:
 *                 type: string
 *               contactPersonName1:
 *                 type: string
 *               mobile1:
 *                 type: string
 *               mobile2:
 *                 type: string
 *               email1:
 *                 type: string
 *               email2:
 *                 type: string
 *               websiteName:
 *                 type: string
 *               panNumber:
 *                 type: string
 *               landlineNumber1:
 *                 type: string
 *               landlineNumber2:
 *                 type: string
 *               bank1Id:
 *                 type: integer
 *               bankAccountNumber1:
 *                 type: string
 *               branch1:
 *                 type: string
 *               beneficiaryName1:
 *                 type: string
 *               ifscCode1:
 *                 type: string
 *               swiftCode1:
 *                 type: string
 *               bank2Id:
 *                 type: integer
 *               bankAccountNumber2:
 *                 type: string
 *               branch3:
 *                 type: string
 *               beneficiaryName3:
 *                 type: string
 *               ifscCode2:
 *                 type: string
 *               swiftCode2:
 *                 type: string
 *     responses:
 *       201:
 *         description: Agent created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Agent'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create agent
 */
router.post("/", auth, acl("agents.write"), createAgent);

/**
 * @swagger
 * /agents/all:
 *   get:
 *     summary: Get all agents without pagination
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all agents
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Agent'
 *       500:
 *         description: Failed to fetch agents
 */
router.get("/all", auth, acl("agents.read"), getAllAgents);

/**
 * @swagger
 * /agents/{id}:
 *   get:
 *     summary: Get agent by ID
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Agent ID
 *     responses:
 *       200:
 *         description: Agent details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Agent'
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Failed to fetch agent
 */
router.get("/:id", auth, acl("agents.read"), getAgentById);

/**
 * @swagger
 * /agents/{id}:
 *   put:
 *     summary: Update an agent
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Agent ID
 *     requestBody:
 *       description: Agent object with updated information
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               agentName:
 *                 type: string
 *               addressLine1:
 *                 type: string
 *               addressLine2:
 *                 type: string
 *               addressLine3:
 *                 type: string
 *               countryId:
 *                 type: integer
 *               stateId:
 *                 type: integer
 *               cityId:
 *                 type: integer
 *               pincode:
 *                 type: string
 *               contactPersonName1:
 *                 type: string
 *               mobile1:
 *                 type: string
 *               mobile2:
 *                 type: string
 *               email1:
 *                 type: string
 *               email2:
 *                 type: string
 *               websiteName:
 *                 type: string
 *               panNumber:
 *                 type: string
 *               landlineNumber1:
 *                 type: string
 *               landlineNumber2:
 *                 type: string
 *               bank1Id:
 *                 type: integer
 *               bankAccountNumber1:
 *                 type: string
 *               branch1:
 *                 type: string
 *               beneficiaryName1:
 *                 type: string
 *               ifscCode1:
 *                 type: string
 *               swiftCode1:
 *                 type: string
 *               bank2Id:
 *                 type: integer
 *               bankAccountNumber2:
 *                 type: string
 *               branch3:
 *                 type: string
 *               beneficiaryName3:
 *                 type: string
 *               ifscCode2:
 *                 type: string
 *               swiftCode2:
 *                 type: string
 *     responses:
 *       200:
 *         description: Agent updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Agent'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Failed to update agent
 */
router.put("/:id", auth, acl("agents.write"), updateAgent);

/**
 * @swagger
 * /agents/{id}:
 *   delete:
 *     summary: Delete an agent by ID
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Agent ID
 *     responses:
 *       204:
 *         description: Agent deleted successfully
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Failed to delete agent
 */
router.delete("/:id", auth, acl("agents.delete"), deleteAgent);

module.exports = router;
