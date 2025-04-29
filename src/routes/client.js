const express = require("express");
const router = express.Router();
const {
  getClients,
  createClient,
  getClientById,
  updateClient,
  deleteClient,
  getAllClients,
} = require("../controllers/clientController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: Clients
 *   description: Client management endpoints
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /clients:
 *   get:
 *     summary: Get all clients with pagination, sorting, and search
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of clients per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for client name, email, or mobile
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
 *         description: List of all clients
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clients:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       clientName:
 *                         type: string
 *                       gender:
 *                         type: string
 *                       email:
 *                         type: string
 *                       mobile1:
 *                         type: string
 *                       mobile2:
 *                         type: string
 *                       address1:
 *                         type: string
 *                       address2:
 *                         type: string
 *                       stateId:
 *                         type: integer
 *                       cityId:
 *                         type: integer
 *                       pincode:
 *                         type: string
 *                       dateOfBirth:
 *                         type: string
 *                         format: date-time
 *                       marriageDate:
 *                         type: string
 *                         format: date-time
 *                       referBy:
 *                         type: string
 *                       passportNo:
 *                         type: string
 *                       panNo:
 *                         type: string
 *                       aadharNo:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalClients:
 *                   type: integer
 *       500:
 *         description: Failed to fetch clients
 */
router.get("/", auth, acl("clients.read"), getClients);

/**
 * @swagger
 * /clients:
 *   post:
 *     summary: Create a new client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clientName:
 *                 type: string
 *               gender:
 *                 type: string
 *               email:
 *                 type: string
 *               mobile1:
 *                 type: string
 *               mobile2:
 *                 type: string
 *               address1:
 *                 type: string
 *               address2:
 *                 type: string
 *               stateId:
 *                 type: integer
 *               cityId:
 *                 type: integer
 *               pincode:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date-time
 *               marriageDate:
 *                 type: string
 *                 format: date-time
 *               referBy:
 *                 type: string
 *               passportNo:
 *                 type: string
 *               panNo:
 *                 type: string
 *               aadharNo:
 *                 type: string
 *               familyFriends:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     gender:
 *                       type: string
 *                     relation:
 *                       type: string
 *                     aadharNo:
 *                       type: string
 *                     dateOfBirth:
 *                       type: string
 *                       format: date-time
 *                     anniversaryDate:
 *                       type: string
 *                       format: date-time
 *                     foodType:
 *                       type: string
 *                     mobile:
 *                       type: string
 *                     email:
 *                       type: string
 *     responses:
 *       201:
 *         description: Client created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create client
 */
router.post("/", auth, acl("clients.write"), createClient);

/**
 * @swagger
 * /clients/all:
 *   get:
 *     summary: Get all clients without pagination, sorting, and search
 *     tags: [clients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all clients
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *       500:
 *         description: Failed to fetch clients
 */
router.get("/all", auth, acl("clients.read"), getAllClients);

/**
 * @swagger
 * /clients/{id}:
 *   get:
 *     summary: Get client by ID
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Client ID
 *     responses:
 *       200:
 *         description: Client details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 clientName:
 *                   type: string
 *                 gender:
 *                   type: string
 *                 email:
 *                   type: string
 *                 mobile1:
 *                   type: string
 *                 mobile2:
 *                   type: string
 *                 address1:
 *                   type: string
 *                 address2:
 *                   type: string
 *                 stateId:
 *                   type: integer
 *                 cityId:
 *                   type: integer
 *                 pincode:
 *                   type: string
 *                 dateOfBirth:
 *                   type: string
 *                   format: date-time
 *                 marriageDate:
 *                   type: string
 *                   format: date-time
 *                 referBy:
 *                   type: string
 *                 passportNo:
 *                   type: string
 *                 panNo:
 *                   type: string
 *                 aadharNo:
 *                   type: string
 *                 familyFriends:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       gender:
 *                         type: string
 *                       relation:
 *                         type: string
 *                       aadharNo:
 *                         type: string
 *                       dateOfBirth:
 *                         type: string
 *                         format: date-time
 *                       anniversaryDate:
 *                         type: string
 *                         format: date-time
 *                       foodType:
 *                         type: string
 *                       mobile:
 *                         type: string
 *                       email:
 *                         type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Client not found
 *       500:
 *         description: Failed to fetch client
 */
router.get("/:id", auth, acl("clients.read"), getClientById);

/**
 * @swagger
 * /clients/{id}:
 *   put:
 *     summary: Update client by ID
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Client ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clientName:
 *                 type: string
 *               gender:
 *                 type: string
 *               email:
 *                 type: string
 *               mobile1:
 *                 type: string
 *               mobile2:
 *                 type: string
 *               address1:
 *                 type: string
 *               address2:
 *                 type: string
 *               stateId:
 *                 type: integer
 *               cityId:
 *                 type: integer
 *               pincode:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date-time
 *               marriageDate:
 *                 type: string
 *                 format: date-time
 *               referBy:
 *                 type: string
 *               passportNo:
 *                 type: string
 *               panNo:
 *                 type: string
 *               aadharNo:
 *                 type: string
 *               familyFriends:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     gender:
 *                       type: string
 *                     relation:
 *                       type: string
 *                     aadharNo:
 *                       type: string
 *                     dateOfBirth:
 *                       type: string
 *                       format: date-time
 *                     anniversaryDate:
 *                       type: string
 *                       format: date-time
 *                     foodType:
 *                       type: string
 *                     mobile:
 *                       type: string
 *                     email:
 *                       type: string
 *     responses:
 *       200:
 *         description: Client updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Client not found
 *       500:
 *         description: Failed to update client
 */
router.put("/:id", auth, acl("clients.write"), updateClient);

/**
 * @swagger
 * /clients/{id}:
 *   delete:
 *     summary: Delete client by ID
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Client ID
 *     responses:
 *       204:
 *         description: Client deleted successfully
 *       404:
 *         description: Client not found
 *       500:
 *         description: Failed to delete client
 */
router.delete("/:id", auth, acl("clients.delete"), deleteClient);

module.exports = router;
