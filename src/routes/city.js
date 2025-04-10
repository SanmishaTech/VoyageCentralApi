const express = require("express");
const router = express.Router();
const {
  getCities,
  createCity,
  getCityById,
  updateCity,
  deleteCity,
  getAllCities,
} = require("../controllers/cityController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: Cities
 *   description: City management endpoints
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
 * /cities:
 *   get:
 *     summary: Get all cities with pagination, sorting, and search
 *     tags: [Cities]
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
 *         description: Number of cities per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for city name
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
 *         description: List of all cities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cities:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       cityName:
 *                         type: string
 *                       state:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           stateName:
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
 *                 totalCities:
 *                   type: integer
 *       500:
 *         description: Failed to fetch cities
 */
router.get("/", auth, acl("cities.read"), getCities);

/**
 * @swagger
 * /cities:
 *   post:
 *     summary: Create a new city
 *     tags: [Cities]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cityName:
 *                 type: string
 *                 description: Name of the city
 *               stateId:
 *                 type: integer
 *                 description: ID of the state the city belongs to
 *     responses:
 *       201:
 *         description: City created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create city
 */
router.post("/", auth, acl("cities.write"), createCity);

/**
 * @swagger
 * /cities/all:
 *   get:
 *     summary: Get all cities without pagination, sorting, and search
 *     tags: [Cities]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all cities
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   cityName:
 *                     type: string
 *                   state:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       stateName:
 *                         type: string
 *       500:
 *         description: Failed to fetch cities
 */
router.get("/all", auth, acl("cities.read"), getAllCities);

/**
 * @swagger
 * /cities/{id}:
 *   get:
 *     summary: Get city by ID
 *     tags: [Cities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: City ID
 *     responses:
 *       200:
 *         description: City details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 cityName:
 *                   type: string
 *                 state:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     stateName:
 *                       type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: City not found
 *       500:
 *         description: Failed to fetch city
 */
router.get("/:id", auth, acl("cities.read"), getCityById);

/**
 * @swagger
 * /cities/{id}:
 *   put:
 *     summary: Update city by ID
 *     tags: [Cities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: City ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cityName:
 *                 type: string
 *                 description: Name of the city
 *               stateId:
 *                 type: integer
 *                 description: ID of the state the city belongs to
 *     responses:
 *       200:
 *         description: City updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: City not found
 *       500:
 *         description: Failed to update city
 */
router.put("/:id", auth, acl("cities.write"), updateCity);

/**
 * @swagger
 * /cities/{id}:
 *   delete:
 *     summary: Delete city by ID
 *     tags: [Cities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: City ID
 *     responses:
 *       204:
 *         description: City deleted successfully
 *       404:
 *         description: City not found
 *       500:
 *         description: Failed to delete city
 */
router.delete("/:id", auth, acl("cities.delete"), deleteCity);

module.exports = router;