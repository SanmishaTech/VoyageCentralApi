const express = require("express");
const router = express.Router();
const {
  getAgencies,
  createAgency,
  getAgencyById,
  updateAgency,
  deleteAgency,
} = require("../controllers/agencyController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: Agencies
 *   description: Agency management endpoints
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
 * /agencies:
 *   get:
 *     summary: Get all agencies
 *     tags: [Agencies]
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
 *         description: Number of agencies per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for agency name or contact person
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
 *         description: List of all agencies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 agencies:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       businessName:
 *                         type: string
 *                       addressLine1:
 *                         type: string
 *                       state1:
 *                         type: string
 *                       city1:
 *                         type: string
 *                       pincode1:
 *                         type: string
 *                       contactPersonName:
 *                         type: string
 *                       contactPersonEmail:
 *                         type: string
 *                       contactPersonPhone:
 *                         type: string
 *                       gstin:
 *                         type: string
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
 *         description: Failed to fetch agencies
 */
router.get("/", auth, acl("agencies.read"), getAgencies);

/**
 * @swagger
 * /agencies:
 *   post:
 *     summary: Create a new agency
 *     tags: [Agencies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessName:
 *                 type: string
 *               addressLine1:
 *                 type: string
 *               state1:
 *                 type: string
 *               city1:
 *                 type: string
 *               pincode1:
 *                 type: string
 *               addressLine2:
 *                 type: string
 *               state2:
 *                 type: string
 *               city2:
 *                 type: string
 *               pincode2:
 *                 type: string
 *               contactPersonName:
 *                 type: string
 *               contactPersonEmail:
 *                 type: string
 *               contactPersonPhone:
 *                 type: string
 *               gstin:
 *                 type: string
 *               letterHead:
 *                 type: string
 *                 description: Letterhead attachment (file path or URL)
 *               currentSubscriptionId:
 *                 type: integer
 *                 description: ID of the current subscription
 *               logo:
 *                 type: string
 *                 description: Logo (file path or URL)
 *     responses:
 *       201:
 *         description: Agency created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create agency
 */
router.post("/", auth, acl("agencies.write"), createAgency);

/**
 * @swagger
 * /agencies/{id}:
 *   get:
 *     summary: Get agency by ID
 *     tags: [Agencies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Agency ID
 *     responses:
 *       200:
 *         description: Agency details
 *       404:
 *         description: Agency not found
 *       500:
 *         description: Failed to fetch agency
 */
router.get("/:id", auth, acl("agencies.read"), getAgencyById);

/**
 * @swagger
 * /agencies/{id}:
 *   put:
 *     summary: Update agency by ID
 *     tags: [Agencies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Agency ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessName:
 *                 type: string
 *               addressLine1:
 *                 type: string
 *               state1:
 *                 type: string
 *               city1:
 *                 type: string
 *               pincode1:
 *                 type: string
 *               addressLine2:
 *                 type: string
 *               state2:
 *                 type: string
 *               city2:
 *                 type: string
 *               pincode2:
 *                 type: string
 *               contactPersonName:
 *                 type: string
 *               contactPersonEmail:
 *                 type: string
 *               contactPersonPhone:
 *                 type: string
 *               gstin:
 *                 type: string
 *     responses:
 *       200:
 *         description: Agency updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Agency not found
 *       500:
 *         description: Failed to update agency
 */
router.put("/:id", auth, acl("agencies.write"), updateAgency);

/**
 * @swagger
 * /agencies/{id}:
 *   delete:
 *     summary: Delete agency by ID
 *     tags: [Agencies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Agency ID
 *     responses:
 *       204:
 *         description: Agency deleted successfully
 *       404:
 *         description: Agency not found
 *       500:
 *         description: Failed to delete agency
 */
router.delete("/:id", auth, acl("agencies.delete"), deleteAgency);

module.exports = router;