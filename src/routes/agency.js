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
const createUploadMiddleware = require("../middleware/uploadMiddleware");
const multer = require("multer");
const agencyUploadConfig = [
  {
    name: "logo",
    allowedTypes: ["image/jpeg", "image/png", "image/jpg"],
    maxSize: 2 * 1024 * 1024, // 2MB
  },
  {
    name: "letterHead",
    allowedTypes: ["image/jpeg", "image/png", "image/jpg"],
    maxSize: 5 * 1024 * 1024, // 5MB
  },
];
const uploadMiddleware = createUploadMiddleware("agency", agencyUploadConfig);

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
 *         description: Search term for filtering agencies
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
 *                       addressLine2:
 *                         type: string
 *                       state:
 *                         type: string
 *                       city:
 *                         type: string
 *                       pincode:
 *                         type: string
 *                       contactPersonName:
 *                         type: string
 *                       contactPersonEmail:
 *                         type: string
 *                         format: email
 *                       contactPersonPhone:
 *                         type: string
 *                       gstin:
 *                         type: string
 *                       letterHead:
 *                         type: string
 *                       logo:
 *                         type: string
 *                       currentSubscription:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           startDate:
 *                             type: string
 *                             format: date
 *                           endDate:
 *                             type: string
 *                             format: date
 *                           package:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               packageName:
 *                                 type: string
 *                               numberOfBranches:
 *                                 type: integer
 *                               usersPerBranch:
 *                                 type: integer
 *                               periodInMonths:
 *                                 type: integer
 *                               cost:
 *                                 type: number
 *                                 format: float
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               businessName:
 *                 type: string
 *               addressLine1:
 *                 type: string
 *               addressLine2:
 *                 type: string
 *               state:
 *                 type: string
 *               city:
 *                 type: string
 *               pincode:
 *                 type: string
 *               contactPersonName:
 *                 type: string
 *               contactPersonEmail:
 *                 type: string
 *                 format: email
 *               contactPersonPhone:
 *                 type: string
 *               gstin:
 *                 type: string
 *               letterHead:
 *                 type: string
 *                 format: binary
 *               logo:
 *                 type: string
 *                 format: binary
 *               subscription:
 *                 type: object
 *                 properties:
 *                   packageId:
 *                     type: integer
 *                   startDate:
 *                     type: string
 *                     format: date
 *               user:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                     format: email
 *                   password:
 *                     type: string
 *     responses:
 *       201:
 *         description: Agency created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create agency
 */
router.post(
  "/",
  auth,
  acl("agencies.write"),

  ...uploadMiddleware, // Spread the array of middleware functions
  createAgency
);
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 businessName:
 *                   type: string
 *                 addressLine1:
 *                   type: string
 *                 addressLine2:
 *                   type: string
 *                 state:
 *                   type: string
 *                 city:
 *                   type: string
 *                 pincode:
 *                   type: string
 *                 contactPersonName:
 *                   type: string
 *                 contactPersonEmail:
 *                   type: string
 *                   format: email
 *                 contactPersonPhone:
 *                   type: string
 *                 gstin:
 *                   type: string
 *                 letterHead:
 *                   type: string
 *                 logo:
 *                   type: string
 *                 subscriptions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       startDate:
 *                         type: string
 *                         format: date
 *                       endDate:
 *                         type: string
 *                         format: date
 *                       package:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           packageName:
 *                             type: string
 *                           numberOfBranches:
 *                             type: integer
 *                           usersPerBranch:
 *                             type: integer
 *                           periodInMonths:
 *                             type: integer
 *                           cost:
 *                             type: number
 *                             format: float
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
 *     summary: Update an existing agency
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               businessName:
 *                 type: string
 *               addressLine1:
 *                 type: string
 *               addressLine2:
 *                 type: string
 *               state:
 *                 type: string
 *               city:
 *                 type: string
 *               pincode:
 *                 type: string
 *               contactPersonName:
 *                 type: string
 *               contactPersonEmail:
 *                 type: string
 *                 format: email
 *               contactPersonPhone:
 *                 type: string
 *               gstin:
 *                 type: string
 *               letterHead:
 *                 type: string
 *                 format: binary
 *               logo:
 *                 type: string
 *                 format: binary
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
router.put(
  "/:id",
  auth,
  acl("agencies.write"),
  ...uploadMiddleware, // Spread the array of middleware functions
  updateAgency
);

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
