const express = require("express");
const router = express.Router();
const {
  createBookingReceipt,
  getBookingReceiptById,
  updateBookingReceipt,
  deleteBookingReceipt,
  getAllBookingReceiptsByBookingId,
  generateInvoice,
} = require("../controllers/bookingReceiptController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: BookingReceipts
 *   description: Booking receipt management endpoints
 */

/**
 * @swagger
 * /booking-receipts/booking/{id}:
 *   get:
 *     summary: Get all booking receipts by booking ID
 *     tags: [BookingReceipts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: List of booking receipts for the booking
 *       500:
 *         description: Failed to fetch booking receipts
 */
router.get(
  "/booking/:id",
  auth,
  acl("bookingReceipts.read"),
  getAllBookingReceiptsByBookingId
);

/**
 * @swagger
 * /invoice/{id}:
 *   get:
 *     summary: Generate and download an invoice PDF
 *     description: Generates a PDF invoice for the specified booking receipt ID. Requires authentication and appropriate permissions.
 *     tags:
 *       - Booking Receipts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the booking receipt
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: PDF invoice successfully generated
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized – user is not authenticated
 *       403:
 *         description: Forbidden – user lacks required permissions
 *       404:
 *         description: Booking receipt not found
 *       500:
 *         description: Server error while generating invoice
 */

router.get("/invoice/:id", auth, acl("bookingReceipts.read"), generateInvoice);

/**
 * @swagger
 * /booking-receipts:
 *   post:
 *     summary: Create a new booking receipt
 *     tags: [BookingReceipts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agencyId
 *               - bookingId
 *               - receiptNumber
 *               - receiptDate
 *               - paymentMode
 *               - amount
 *             properties:
 *               agencyId:
 *                 type: integer
 *               bookingId:
 *                 type: integer
 *               receiptNumber:
 *                 type: string
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
 *     responses:
 *       201:
 *         description: Booking receipt created
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Failed to create booking receipt
 */
router.post("/:id", auth, acl("bookingReceipts.write"), createBookingReceipt);

/**
 * @swagger
 * /booking-receipts/{id}:
 *   get:
 *     summary: Get a booking receipt by ID
 *     tags: [BookingReceipts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Booking receipt ID
 *     responses:
 *       200:
 *         description: Booking receipt details
 *       404:
 *         description: Booking receipt not found
 *       500:
 *         description: Failed to fetch booking receipt
 */
router.get("/:id", auth, acl("bookingReceipts.read"), getBookingReceiptById);

/**
 * @swagger
 * /booking-receipts/{id}:
 *   put:
 *     summary: Update a booking receipt
 *     tags: [BookingReceipts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Booking receipt ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookingReceipt'
 *     responses:
 *       200:
 *         description: Booking receipt updated
 *       404:
 *         description: Booking receipt not found
 *       500:
 *         description: Failed to update booking receipt
 */
router.put("/:id", auth, acl("bookingReceipts.write"), updateBookingReceipt);

/**
 * @swagger
 * /booking-receipts/{id}:
 *   delete:
 *     summary: Delete a booking receipt
 *     tags: [BookingReceipts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Booking receipt ID
 *     responses:
 *       204:
 *         description: Booking receipt deleted
 *       404:
 *         description: Booking receipt not found
 *       500:
 *         description: Failed to delete booking receipt
 */
router.delete(
  "/:id",
  auth,
  acl("bookingReceipts.delete"),
  deleteBookingReceipt
);

module.exports = router;
