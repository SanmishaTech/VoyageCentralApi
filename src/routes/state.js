const express = require("express");
const router = express.Router();
const {
  getStates,
  createState,
  getStateById,
  updateState,
  deleteState,
  getAllStates,
} = require("../controllers/stateController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: States
 *   description: State management endpoints
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
 * /states:
 *   get:
 *     summary: Get all states with pagination, sorting, and search
 *     tags: [States]
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
 *         description: Number of states per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for state name
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
 *         description: List of all states
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 states:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       stateName:
 *                         type: string
 *                       country:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           countryName:
 *                             type: string
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
 *                 totalStates:
 *                   type: integer
 *       500:
 *         description: Failed to fetch states
 */
router.get("/", auth, acl("states.read"), getStates);

/**
 * @swagger
 * /states:
 *   post:
 *     summary: Create a new state
 *     tags: [States]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stateName:
 *                 type: string
 *                 description: Name of the state
 *               countryId:
 *                 type: integer
 *                 description: ID of the country the state belongs to
 *     responses:
 *       201:
 *         description: State created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create state
 */
router.post("/", auth, acl("states.write"), createState);

/**
 * @swagger
 * /states/all:
 *   get:
 *     summary: Get all states without pagination, sorting, and search
 *     tags: [States]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all states
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   stateName:
 *                     type: string
 *                   country:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       countryName:
 *                         type: string
 *       500:
 *         description: Failed to fetch states
 */
router.get("/all", auth, acl("states.read"), getAllStates);

/**
 * @swagger
 * /states/{id}:
 *   get:
 *     summary: Get state by ID
 *     tags: [States]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: State ID
 *     responses:
 *       200:
 *         description: State details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 stateName:
 *                   type: string
 *                 country:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     countryName:
 *                       type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: State not found
 *       500:
 *         description: Failed to fetch state
 */
router.get("/:id", auth, acl("states.read"), getStateById);

/**
 * @swagger
 * /states/{id}:
 *   put:
 *     summary: Update state by ID
 *     tags: [States]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: State ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stateName:
 *                 type: string
 *                 description: Name of the state
 *               countryId:
 *                 type: integer
 *                 description: ID of the country the state belongs to
 *     responses:
 *       200:
 *         description: State updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: State not found
 *       500:
 *         description: Failed to update state
 */
router.put("/:id", auth, acl("states.write"), updateState);

/**
 * @swagger
 * /states/{id}:
 *   delete:
 *     summary: Delete state by ID
 *     tags: [States]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: State ID
 *     responses:
 *       204:
 *         description: State deleted successfully
 *       404:
 *         description: State not found
 *       500:
 *         description: Failed to delete state
 */
router.delete("/:id", auth, acl("states.delete"), deleteState);

module.exports = router;