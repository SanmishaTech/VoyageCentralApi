const express = require("express");
const router = express.Router();
const {
  getPackages,
  createPackage,
  getPackageById,
  updatePackage,
  deletePackage,
} = require("../controllers/packageController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: Packages
 *   description: Package management endpoints
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
 * /packages:
 *   get:
 *     summary: Get all packages
 *     tags: [Packages]
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
 *         description: Number of packages per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for package name
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: id
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of all packages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       packageName:
 *                         type: string
 *                       numberOfBranches:
 *                         type: integer
 *                       usersPerBranch:
 *                         type: integer
 *                       periodInMonths:
 *                         type: integer
 *                       cost:
 *                         type: number
 *                         format: float
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       500:
 *         description: Failed to fetch packages
 */
router.get("/", auth, acl("packages.read"), getPackages);

/**
 * @swagger
 * /packages:
 *   post:
 *     summary: Create a new package
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               packageName:
 *                 type: string
 *               numberOfBranches:
 *                 type: integer
 *               usersPerBranch:
 *                 type: integer
 *               periodInMonths:
 *                 type: integer
 *               cost:
 *                 type: number
 *                 format: float
 *     responses:
 *       201:
 *         description: Package created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create package
 */
router.post("/", auth, acl("packages.write"), createPackage);

/**
 * @swagger
 * /packages/{id}:
 *   get:
 *     summary: Get package by ID
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Package ID
 *     responses:
 *       200:
 *         description: Package details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 packageName:
 *                   type: string
 *                 numberOfBranches:
 *                   type: integer
 *                 usersPerBranch:
 *                   type: integer
 *                 periodInMonths:
 *                   type: integer
 *                 cost:
 *                   type: number
 *                   format: float
 *       404:
 *         description: Package not found
 *       500:
 *         description: Failed to fetch package
 */
router.get("/:id", auth, acl("packages.read"), getPackageById);

/**
 * @swagger
 * /packages/{id}:
 *   put:
 *     summary: Update package by ID
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Package ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               packageName:
 *                 type: string
 *               numberOfBranches:
 *                 type: integer
 *               usersPerBranch:
 *                 type: integer
 *               periodInMonths:
 *                 type: integer
 *               cost:
 *                 type: number
 *                 format: float
 *     responses:
 *       200:
 *         description: Package updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Package not found
 *       500:
 *         description: Failed to update package
 */
router.put("/:id", auth, acl("packages.write"), updatePackage);

/**
 * @swagger
 * /packages/{id}:
 *   delete:
 *     summary: Delete package by ID
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Package ID
 *     responses:
 *       204:
 *         description: Package deleted successfully
 *       404:
 *         description: Package not found
 *       500:
 *         description: Failed to delete package
 */
router.delete("/:id", auth, acl("packages.delete"), deletePackage);

module.exports = router;
