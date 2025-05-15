const express = require("express");
const router = express.Router();
const {
  createTravelDocument,
  getTravelDocumentById,
  updateTravelDocument,
  deleteTravelDocument,
  getAllTravelDocumentsByBookingId,
} = require("../controllers/travelDocumentController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");
const createUploadMiddleware = require("../middleware/uploadMiddleware");
const tourUploadConfig = [
  {
    name: "attachment",
    allowedTypes: ["image/jpeg", "image/png", "image/jpg"],
    maxSize: 2 * 1024 * 1024, // 2MB
  },
];
const uploadMiddleware = createUploadMiddleware(
  "booking/travelDocuments",
  tourUploadConfig
);

/**
 * @swagger
 * tags:
 *   name: TravelDocuments
 *   description: Travel document management endpoints
 */

/**
 * @swagger
 * /travel-documents:
 *   get:
 *     summary: Get travel documents with pagination
 *     tags: [TravelDocuments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Current page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of travel documents per page
 *       - in: query
 *         name: bookingId
 *         schema:
 *           type: integer
 *         description: Filter by Booking ID
 *     responses:
 *       200:
 *         description: List of travel documents with pagination metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 travelDocuments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TravelDocument'
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalDocuments:
 *                   type: integer
 *       500:
 *         description: Failed to fetch travel documents
 */
router.get(
  "/booking/:id",
  auth,
  acl("travelDocuments.read"),
  getAllTravelDocumentsByBookingId
);
/**
 * @swagger
 * /travel-documents:
 *   post:
 *     summary: Create a new travel document
 *     tags: [TravelDocuments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Travel document object to create
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *              - bookingId
 *              - description
 *              - isPrivate
 *             properties:
 *               bookingId:
 *                 type: integer
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *               isPrivate:
 *                 type: boolean
 *               uploadUUID:
 *                 type: string
 *               attachmentName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Travel document created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TravelDocument'
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Failed to create travel document
 */
router.post(
  "/:id",
  auth,
  acl("travelDocuments.write"),
  ...uploadMiddleware, // Spread the array of middleware functions
  createTravelDocument
);

/**
 * @swagger
 * /travel-documents/{id}:
 *   get:
 *     summary: Get a travel document by ID
 *     tags: [TravelDocuments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Travel document ID
 *     responses:
 *       200:
 *         description: Travel document details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TravelDocument'
 *       404:
 *         description: Travel document not found
 *       500:
 *         description: Failed to fetch travel document
 */
router.get("/:id", auth, acl("travelDocuments.read"), getTravelDocumentById);

/**
 * @swagger
 * /travel-documents/{id}:
 *   put:
 *     summary: Update a travel document
 *     tags: [TravelDocuments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Travel document ID
 *     requestBody:
 *       description: Travel document object with updated data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TravelDocument'
 *     responses:
 *       200:
 *         description: Travel document updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TravelDocument'
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Travel document not found
 *       500:
 *         description: Failed to update travel document
 */
router.put(
  "/:id",
  auth,
  acl("travelDocuments.write"),
  ...uploadMiddleware, // Spread the array of middleware functions
  updateTravelDocument
);

/**
 * @swagger
 * /travel-documents/{id}:
 *   delete:
 *     summary: Delete a travel document
 *     tags: [TravelDocuments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Travel document ID
 *     responses:
 *       204:
 *         description: Travel document deleted successfully
 *       404:
 *         description: Travel document not found
 *       500:
 *         description: Failed to delete travel document
 */
router.delete(
  "/:id",
  auth,
  acl("travelDocuments.delete"),
  deleteTravelDocument
);

module.exports = router;
