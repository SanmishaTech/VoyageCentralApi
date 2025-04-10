const express = require("express");
const router = express.Router();
const {
  getCountries,
  createCountry,
  getCountryById,
  updateCountry,
  deleteCountry,
  getAllCountries,
} = require("../controllers/countryController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: Countries
 *   description: Country management endpoints
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
 * /countries:
 *   get:
 *     summary: Get all countries with pagination, sorting, and search
 *     tags: [Countries]
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
 *         description: Number of countries per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for country name
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
 *         description: List of all countries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 countries:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
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
 *                 totalCountries:
 *                   type: integer
 *       500:
 *         description: Failed to fetch countries
 */
router.get("/", auth, acl("countries.read"), getCountries);

/**
 * @swagger
 * /countries:
 *   post:
 *     summary: Create a new country
 *     tags: [Countries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               countryName:
 *                 type: string
 *                 description: Name of the country
 *     responses:
 *       201:
 *         description: Country created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create country
 */
router.post("/", auth, acl("countries.write"), createCountry);

/**
 * @swagger
 * /countries/all:
 *   get:
 *     summary: Get all countries without pagination, sorting, and search
 *     tags: [Countries]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all countries
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
 *         description: Failed to fetch countries
 */
router.get("/all", auth, acl("countries.read"), getAllCountries);

/**
 * @swagger
 * /countries/{id}:
 *   get:
 *     summary: Get country by ID
 *     tags: [Countries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Country ID
 *     responses:
 *       200:
 *         description: Country details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Country not found
 *       500:
 *         description: Failed to fetch country
 */
router.get("/:id", auth, acl("countries.read"), getCountryById);

/**
 * @swagger
 * /countries/{id}:
 *   put:
 *     summary: Update country by ID
 *     tags: [Countries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Country ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               countryName:
 *                 type: string
 *                 description: Name of the country
 *     responses:
 *       200:
 *         description: Country updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Country not found
 *       500:
 *         description: Failed to update country
 */
router.put("/:id", auth, acl("countries.write"), updateCountry);

/**
 * @swagger
 * /countries/{id}:
 *   delete:
 *     summary: Delete country by ID
 *     tags: [Countries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Country ID
 *     responses:
 *       204:
 *         description: Country deleted successfully
 *       404:
 *         description: Country not found
 *       500:
 *         description: Failed to delete country
 */
router.delete("/:id", auth, acl("countries.delete"), deleteCountry);

module.exports = router;
