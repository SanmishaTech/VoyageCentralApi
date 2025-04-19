const express = require("express");
const router = express.Router();
const {
  getAccommodations,
  createAccommodation,
  getAccommodationById,
  updateAccommodation,
  deleteAccommodation,
  getAllAccommodations,
} = require("../controllers/accommodationController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: Accommodations
 *   description: Accommodation management endpoints
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
 * /accommodations:
 *   get:
 *     summary: Get all accommodations with pagination, sorting, and search
 *     tags: [Accommodations]
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
 *         description: Number of accommodations per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for accommodation name
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
 *         description: List of all accommodations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accommodations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       AccommodationName:
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
 *                 totalAccommodations:
 *                   type: integer
 *       500:
 *         description: Failed to fetch accommodations
 */
router.get("/", auth, acl("accommodations.read"), getAccommodations);

/**
 * @swagger
 * /accommodations:
 *   post:
 *     summary: Create a new accommodation
 *     tags: [Accommodations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               AccommodationName:
 *                 type: string
 *                 description: Name of the accommodation
 *     responses:
 *       201:
 *         description: Accommodation created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create accommodation
 */
router.post("/", auth, acl("accommodations.write"), createAccommodation);

/**
 * @swagger
 * /accommodations/all:
 *   get:
 *     summary: Get all accommodations without pagination, sorting, and search
 *     tags: [Accommodations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all accommodations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   AccommodationName:
 *                     type: string
 *       500:
 *         description: Failed to fetch accommodations
 */
router.get("/all", auth, acl("accommodations.read"), getAllAccommodations);

/**
 * @swagger
 * /accommodations/{id}:
 *   get:
 *     summary: Get accommodation by ID
 *     tags: [Accommodations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Accommodation ID
 *     responses:
 *       200:
 *         description: Accommodation details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 AccommodationName:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Accommodation not found
 *       500:
 *         description: Failed to fetch accommodation
 */
router.get("/:id", auth, acl("accommodations.read"), getAccommodationById);

/**
 * @swagger
 * /accommodations/{id}:
 *   put:
 *     summary: Update accommodation by ID
 *     tags: [Accommodations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Accommodation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               AccommodationName:
 *                 type: string
 *                 description: Name of the accommodation
 *     responses:
 *       200:
 *         description: Accommodation updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Accommodation not found
 *       500:
 *         description: Failed to update accommodation
 */
router.put("/:id", auth, acl("accommodations.write"), updateAccommodation);

/**
 * @swagger
 * /accommodations/{id}:
 *   delete:
 *     summary: Delete accommodation by ID
 *     tags: [Accommodations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Accommodation ID
 *     responses:
 *       204:
 *         description: Accommodation deleted successfully
 *       404:
 *         description: Accommodation not found
 *       500:
 *         description: Failed to delete accommodation
 */
router.delete("/:id", auth, acl("accommodations.delete"), deleteAccommodation);

module.exports = router;