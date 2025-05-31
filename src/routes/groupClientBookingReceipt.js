const express = require("express");
const router = express.Router();
const {
  createGroupClientBookingReceipt,
  deleteGroupClientBookingReceipt,
  getAllBookingReceiptsByGroupClientBookingId,
  generateGroupClientInvoice,
} = require("../controllers/groupBooking/groupClientBookingReceiptController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: GroupClientBookingReceipts
 *   description: Group client booking receipt management endpoints
 */

/**
 * @swagger
 * /group-client-booking-receipts/group-client-booking/{id}:
 *   get:
 *     summary: Get all receipts by group client booking ID
 *     tags: [GroupClientBookingReceipts]
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
 *         description: List of receipts for the group client booking
 *       500:
 *         description: Failed to fetch receipts
 */
router.get(
  "/all/:groupClientBookingId",
  auth,
  acl("groupClientBookingReceipts.read"),
  getAllBookingReceiptsByGroupClientBookingId
);

/**
 * @swagger
 * /group-client-booking-receipts/{id}:
 *   post:
 *     summary: Create a new group client booking receipt
 *     tags: [GroupClientBookingReceipts]
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
 *             properties:
 *               receiptDate:
 *                 type: string
 *                 format: date-time
 *               paymentMode:
 *                 type: string
 *               amount:
 *                 type: number
 *                 format: float
 *               bankId:
 *                 type: integer
 *               chequeDate:
 *                 type: string
 *                 format: date-time
 *               chequeNumber:
 *                 type: string
 *               utrNumber:
 *                 type: string
 *               neftImpfNumber:
 *                 type: string
 *               cgstPercent:
 *                 type: number
 *               cgstAmount:
 *                 type: number
 *               sgstPercent:
 *                 type: number
 *               sgstAmount:
 *                 type: number
 *               igstPercent:
 *                 type: number
 *               igstAmount:
 *                 type: number
 *               totalAmount:
 *                 type: number
 *               paymentDate:
 *                 type: string
 *                 format: date-time
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Receipt created
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create receipt
 */
router.post(
  "/:groupClientBookingId",
  auth,
  acl("groupClientBookingReceipts.write"),
  createGroupClientBookingReceipt
);

/**
 * @swagger
 * /group-client-booking-receipts/{id}:
 *   delete:
 *     summary: Delete a group client booking receipt by ID
 *     tags: [GroupClientBookingReceipts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Receipt ID
 *     responses:
 *       204:
 *         description: Receipt deleted
 *       404:
 *         description: Receipt not found
 *       500:
 *         description: Failed to delete receipt
 */
router.delete(
  "/:bookingReceiptId",
  auth,
  acl("groupClientBookingReceipts.delete"),
  deleteGroupClientBookingReceipt
);

/**
 * @swagger
 * /group-client-booking-receipts/{id}/invoice:
 *   get:
 *     summary: Generate invoice for a group client booking receipt
 *     tags: [GroupClientBookingReceipts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Receipt ID
 *     responses:
 *       200:
 *         description: Invoice generated
 *       404:
 *         description: Receipt not found
 *       500:
 *         description: Failed to generate invoice
 */
router.get(
  "/:bookingReceiptId/invoice",
  auth,
  acl("groupClientBookingReceipts.read"),
  generateGroupClientInvoice
);

module.exports = router;
