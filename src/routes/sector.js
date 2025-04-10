const express = require("express");
const router = express.Router();
const {
  getSectors,
  createSector,
  getSectorById,
  updateSector,
  deleteSector,
  getAllSectors,
} = require("../controllers/sectorController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: Sectors
 *   description: Sector management endpoints
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
 * /sectors:
 *   get:
 *     summary: Get all sectors with pagination, sorting, and search
 *     tags: [Sectors]
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
 *         description: Number of sectors per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for sector name
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
 *         description: List of all sectors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sectors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       sectorName:
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
 *                 totalSectors:
 *                   type: integer
 *       500:
 *         description: Failed to fetch sectors
 */
router.get("/", auth, acl("sectors.read"), getSectors);

/**
 * @swagger
 * /sectors:
 *   post:
 *     summary: Create a new sector
 *     tags: [Sectors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sectorName:
 *                 type: string
 *                 description: Name of the sector
 *     responses:
 *       201:
 *         description: Sector created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create sector
 */
router.post("/", auth, acl("sectors.write"), createSector);

/**
 * @swagger
 * /sectors/all:
 *   get:
 *     summary: Get all sectors without pagination, sorting, and search
 *     tags: [Sectors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all sectors
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   sectorName:
 *                     type: string
 *       500:
 *         description: Failed to fetch sectors
 */
router.get("/all", auth, acl("sectors.read"), getAllSectors);

/**
 * @swagger
 * /sectors/{id}:
 *   get:
 *     summary: Get sector by ID
 *     tags: [Sectors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Sector ID
 *     responses:
 *       200:
 *         description: Sector details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 sectorName:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Sector not found
 *       500:
 *         description: Failed to fetch sector
 */
router.get("/:id", auth, acl("sectors.read"), getSectorById);

/**
 * @swagger
 * /sectors/{id}:
 *   put:
 *     summary: Update sector by ID
 *     tags: [Sectors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Sector ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sectorName:
 *                 type: string
 *                 description: Name of the sector
 *     responses:
 *       200:
 *         description: Sector updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Sector not found
 *       500:
 *         description: Failed to update sector
 */
router.put("/:id", auth, acl("sectors.write"), updateSector);

/**
 * @swagger
 * /sectors/{id}:
 *   delete:
 *     summary: Delete sector by ID
 *     tags: [Sectors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Sector ID
 *     responses:
 *       204:
 *         description: Sector deleted successfully
 *       404:
 *         description: Sector not found
 *       500:
 *         description: Failed to delete sector
 */
router.delete("/:id", auth, acl("sectors.delete"), deleteSector);

module.exports = router;