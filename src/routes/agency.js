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
 *     summary: Get all agencies with pagination, sorting, and search
 *     tags: [Agencies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination (default is 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of records per page (default is 10)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Field to sort by (default is "id")
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order (default is "asc")
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for filtering agencies
 *     responses:
 *       200:
 *         description: List of agencies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Agency details
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: Total number of agencies
 *                     page:
 *                       type: integer
 *                       description: Current page number
 *                     limit:
 *                       type: integer
 *                       description: Number of records per page
 *                     totalPages:
 *                       type: integer
 *                       description: Total number of pages
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
 *                 description: Name of the agency
 *               addressLine1:
 *                 type: string
 *                 description: Address Line 1 of the agency
 *               addressLine2:
 *                 type: string
 *                 description: Address Line 2 of the agency (optional)
 *               state:
 *                 type: string
 *                 description: State where the agency is located
 *               city:
 *                 type: string
 *                 description: City where the agency is located
 *               pincode:
 *                 type: string
 *                 description: Pincode of the agency's location
 *               contactPersonName:
 *                 type: string
 *                 description: Name of the contact person
 *               contactPersonPhone:
 *                 type: string
 *                 description: Phone number of the contact person
 *               contactPersonEmail:
 *                 type: string
 *                 format: email
 *                 description: Email of the contact person
 *               gstin:
 *                 type: string
 *                 description: GSTIN of the agency (optional, must follow the format 07ABCDE1234F2Z5)
 *               letterHead:
 *                 type: string
 *                 description: Letterhead attachment (file path or URL) (optional)
 *               logo:
 *                 type: string
 *                 description: Logo of the agency (file path or URL) (optional)
 *               subscription:
 *                 type: object
 *                 description: Subscription details
 *                 properties:
 *                   packageId:
 *                     type: integer
 *                     description: ID of the package associated with the subscription
 *                   startDate:
 *                     type: string
 *                     format: date
 *                     description: Start date of the subscription
 *               user:
 *                 type: object
 *                 description: User details for the agency
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: Name of the user
 *                   email:
 *                     type: string
 *                     format: email
 *                     description: Email of the user
 *                   password:
 *                     type: string
 *                     description: Password of the user
 *     responses:
 *       201:
 *         description: Agency created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 agency:
 *                   type: object
 *                   description: Details of the created agency
 *                 subscription:
 *                   type: object
 *                   description: Details of the created subscription
 *                 user:
 *                   type: object
 *                   description: Details of the created user
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
 *     summary: Get an agency by ID
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Details of the agency
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
 *     summary: Update an agency
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
 *                 description: Name of the agency
 *               addressLine1:
 *                 type: string
 *                 description: Address Line 1 of the agency
 *               addressLine2:
 *                 type: string
 *                 description: Address Line 2 of the agency (optional)
 *               state1:
 *                 type: string
 *                 description: State 1 of the agency
 *               city1:
 *                 type: string
 *                 description: City 1 of the agency
 *               pincode1:
 *                 type: string
 *                 description: Pincode 1 of the agency
 *               state2:
 *                 type: string
 *                 description: State 2 of the agency (optional)
 *               city2:
 *                 type: string
 *                 description: City 2 of the agency (optional)
 *               pincode2:
 *                 type: string
 *                 description: Pincode 2 of the agency (optional)
 *               contactPersonName:
 *                 type: string
 *                 description: Name of the contact person
 *               contactPersonPhone:
 *                 type: string
 *                 description: Phone number of the contact person
 *               contactPersonEmail:
 *                 type: string
 *                 format: email
 *                 description: Email of the contact person
 *               gstin:
 *                 type: string
 *                 description: GSTIN of the agency (optional, must follow the format 07ABCDE1234F2Z5)
 *               letterHead:
 *                 type: string
 *                 description: Letterhead attachment (file path or URL) (optional)
 *               logo:
 *                 type: string
 *                 description: Logo of the agency (file path or URL) (optional)
 *               currentSubscriptionId:
 *                 type: integer
 *                 description: ID of the current subscription
 *     responses:
 *       200:
 *         description: Agency updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Updated agency details
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
 *     summary: Delete an agency
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
