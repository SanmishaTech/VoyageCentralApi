const express = require("express");
const router = express.Router();
const {
  createGroupClientTravelDocument,
  getGroupClientTravelDocumentById,
  updateGroupClientTravelDocument,
  deleteGroupClientTravelDocument,
  getAllTravelDocumentsByGroupClientBookingId,
} = require("../controllers/groupBooking/groupClientTravelDocumentController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");
const createUploadMiddleware = require("../middleware/uploadMiddleware");
const travelDocUploadConfig = [
  {
    name: "attachment",
    allowedTypes: ["image/jpeg", "image/png", "image/jpg"],
    maxSize: 2 * 1024 * 1024, // 2MB
  },
];
const uploadMiddleware = createUploadMiddleware(
  "groupBooking/travelDocuments",
  travelDocUploadConfig
);

/**
 * @swagger
 * tags:
 *   name: GroupClientTravelDocuments
 *   description: Group client travel document management endpoints
 */

/**
 * @swagger
 * /group-client-travel-documents/group-client-booking/{id}:
 *   get:
 *     summary: Get all travel documents by group client booking ID
 *     tags: [GroupClientTravelDocuments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Group client booking ID
 *     responses:
 *       200:
 *         description: List of travel documents for the group client booking
 *       500:
 *         description: Failed to fetch travel documents
 */
router.get(
  "/all/:groupClientBookingId",
  auth,
  acl("groupClientTravelDocuments.read"),
  getAllTravelDocumentsByGroupClientBookingId
);

/**
 * @swagger
 * /group-client-travel-documents/{id}:
 *   post:
 *     summary: Create a new group client travel document
 *     tags: [GroupClientTravelDocuments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Group client booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *              - groupClientBookingId
 *              - description
 *              - isPrivate
 *             properties:
 *               groupClientBookingId:
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
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Failed to create travel document
 */
router.post(
  "/:groupClientBookingId",
  auth,
  acl("groupClientTravelDocuments.write"),
  ...uploadMiddleware,
  createGroupClientTravelDocument
);

/**
 * @swagger
 * /group-client-travel-documents/{id}:
 *   get:
 *     summary: Get a group client travel document by ID
 *     tags: [GroupClientTravelDocuments]
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
 *       404:
 *         description: Travel document not found
 *       500:
 *         description: Failed to fetch travel document
 */
router.get(
  "/:travelDocumentId",
  auth,
  acl("groupClientTravelDocuments.read"),
  getGroupClientTravelDocumentById
);

/**
 * @swagger
 * /group-client-travel-documents/{id}:
 *   put:
 *     summary: Update a group client travel document
 *     tags: [GroupClientTravelDocuments]
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TravelDocument'
 *     responses:
 *       200:
 *         description: Travel document updated successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Travel document not found
 *       500:
 *         description: Failed to update travel document
 */
router.put(
  "/:travelDocumentId",
  auth,
  acl("groupClientTravelDocuments.write"),
  ...uploadMiddleware,
  updateGroupClientTravelDocument
);

/**
 * @swagger
 * /group-client-travel-documents/{id}:
 *   delete:
 *     summary: Delete a group client travel document
 *     tags: [GroupClientTravelDocuments]
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
  "/:travelDocumentId",
  auth,
  acl("groupClientTravelDocuments.delete"),
  deleteGroupClientTravelDocument
);

module.exports = router;
