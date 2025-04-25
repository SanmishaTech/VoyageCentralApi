const express = require("express");
const router = express.Router();
const {
  getBanks,
  createBank,
  getBankById,
  updateBank,
  deleteBank,
  getAllBanks,
} = require("../controllers/bankController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: Banks
 *   description: Bank management endpoints
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
 * /banks:
 *   get:
 *     summary: Get all banks with pagination, sorting, and search
 *     tags: [Banks]
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
 *         description: Number of banks per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for bank name
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
 *         description: List of all banks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 banks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       bankName:
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
 *                 totalBanks:
 *                   type: integer
 *       500:
 *         description: Failed to fetch banks
 */
router.get("/", auth, acl("banks.read"), getBanks);

/**
 * @swagger
 * /banks:
 *   post:
 *     summary: Create a new bank
 *     tags: [Banks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bankName:
 *                 type: string
 *                 description: Name of the bank
 *     responses:
 *       201:
 *         description: Bank created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create bank
 */
router.post("/", auth, acl("banks.write"), createBank);

/**
 * @swagger
 * /banks/all:
 *   get:
 *     summary: Get all banks without pagination, sorting, and search
 *     tags: [Banks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all banks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   bankName:
 *                     type: string
 *       500:
 *         description: Failed to fetch banks
 */
router.get("/all", auth, acl("banks.read"), getAllBanks);

/**
 * @swagger
 * /banks/{id}:
 *   get:
 *     summary: Get bank by ID
 *     tags: [Banks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Bank ID
 *     responses:
 *       200:
 *         description: Bank details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 bankName:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Bank not found
 *       500:
 *         description: Failed to fetch bank
 */
router.get("/:id", auth, acl("banks.read"), getBankById);

/**
 * @swagger
 * /banks/{id}:
 *   put:
 *     summary: Update bank by ID
 *     tags: [Banks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Bank ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bankName:
 *                 type: string
 *                 description: Name of the bank
 *     responses:
 *       200:
 *         description: Bank updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Bank not found
 *       500:
 *         description: Failed to update bank
 */
router.put("/:id", auth, acl("banks.write"), updateBank);

/**
 * @swagger
 * /banks/{id}:
 *   delete:
 *     summary: Delete bank by ID
 *     tags: [Banks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Bank ID
 *     responses:
 *       204:
 *         description: Bank deleted successfully
 *       404:
 *         description: Bank not found
 *       500:
 *         description: Failed to delete bank
 */
router.delete("/:id", auth, acl("banks.delete"), deleteBank);

module.exports = router;
