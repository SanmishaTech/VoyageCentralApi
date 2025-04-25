const express = require("express");
const router = express.Router();
const {
  getFairs,
  createFair,
  getFairById,
  updateFair,
  deleteFair,
  getAllFairs,
} = require("../controllers/fairController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: Fairs
 *   description: Fair management endpoints
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
 * /fairs:
 *   get:
 *     summary: Get all fairs with pagination, sorting, and search
 *     tags: [Fairs]
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
 *         description: Number of fairs per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for fair name
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
 *         description: List of all fairs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fairs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       fairName:
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
 *                 totalFairs:
 *                   type: integer
 *       500:
 *         description: Failed to fetch fairs
 */
router.get("/", auth, acl("fairs.read"), getFairs);

/**
 * @swagger
 * /fairs:
 *   post:
 *     summary: Create a new fair
 *     tags: [Fairs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fairName:
 *                 type: string
 *                 description: Name of the fair
 *     responses:
 *       201:
 *         description: Fair created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create fair
 */
router.post("/", auth, acl("fairs.write"), createFair);

/**
 * @swagger
 * /fairs/all:
 *   get:
 *     summary: Get all fairs without pagination, sorting, and search
 *     tags: [Fairs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all fairs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   fairName:
 *                     type: string
 *       500:
 *         description: Failed to fetch fairs
 */
router.get("/all", auth, acl("fairs.read"), getAllFairs);

/**
 * @swagger
 * /fairs/{id}:
 *   get:
 *     summary: Get fair by ID
 *     tags: [Fairs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Fair ID
 *     responses:
 *       200:
 *         description: Fair details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 fairName:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Fair not found
 *       500:
 *         description: Failed to fetch fair
 */
router.get("/:id", auth, acl("fairs.read"), getFairById);

/**
 * @swagger
 * /fairs/{id}:
 *   put:
 *     summary: Update fair by ID
 *     tags: [Fairs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Fair ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fairName:
 *                 type: string
 *                 description: Name of the fair
 *     responses:
 *       200:
 *         description: Fair updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Fair not found
 *       500:
 *         description: Failed to update fair
 */
router.put("/:id", auth, acl("fairs.write"), updateFair);

/**
 * @swagger
 * /fairs/{id}:
 *   delete:
 *     summary: Delete fair by ID
 *     tags: [Fairs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Fair ID
 *     responses:
 *       204:
 *         description: Fair deleted successfully
 *       404:
 *         description: Fair not found
 *       500:
 *         description: Failed to delete fair
 */
router.delete("/:id", auth, acl("fairs.delete"), deleteFair);

module.exports = router;
