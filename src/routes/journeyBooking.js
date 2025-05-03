const express = require("express");
const router = express.Router();
const {
  createJourneyBooking,
  getJourneyBookingById,
  updateJourneyBooking,
  deleteJourneyBooking,
  getAllJourneyBookingsByBookingId,
} = require("../controllers/journeyBookingController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: JourneyBookings
 *   description: Journey booking management endpoints
 */

/**
 * @swagger
 * /journey-bookings/booking/{id}:
 *   get:
 *     summary: Get all journey bookings by booking ID
 *     tags: [JourneyBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: List of journey bookings
 *       500:
 *         description: Failed to fetch journey bookings
 */
router.get(
  "/booking/:id",
  auth,
  acl("journeyBookings.read"),
  getAllJourneyBookingsByBookingId
);

/**
 * @swagger
 * /journey-bookings/{id}:
 *   get:
 *     summary: Get a journey booking by ID
 *     tags: [JourneyBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Journey booking ID
 *     responses:
 *       200:
 *         description: Journey booking details
 *       404:
 *         description: Journey booking not found
 *       500:
 *         description: Failed to fetch journey booking
 */
router.get("/:id", auth, acl("journeyBookings.read"), getJourneyBookingById);

/**
 * @swagger
 * /journey-bookings/{id}:
 *   post:
 *     summary: Create a new journey booking
 *     tags: [JourneyBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mode
 *             properties:
 *               mode:
 *                 type: string
 *               fromPlace:
 *                 type: string
 *               toPlace:
 *                 type: string
 *               journeyBookingDate:
 *                 type: string
 *                 format: date-time
 *               fromDepartureDate:
 *                 type: string
 *                 format: date-time
 *               toArrivalDate:
 *                 type: string
 *                 format: date-time
 *               foodType:
 *                 type: string
 *               billDescription:
 *                 type: string
 *               trainName:
 *                 type: string
 *               class:
 *                 type: string
 *               pnrNumber:
 *                 type: string
 *               trainNumber:
 *                 type: string
 *               busName:
 *                 type: string
 *               flightNumber:
 *                 type: string
 *               airlineId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Journey booking created
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create journey booking
 */
router.post("/:id", auth, acl("journeyBookings.write"), createJourneyBooking);

/**
 * @swagger
 * /journey-bookings/{id}:
 *   put:
 *     summary: Update a journey booking by ID
 *     tags: [JourneyBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Journey booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mode
 *             properties:
 *               mode:
 *                 type: string
 *               fromPlace:
 *                 type: string
 *               toPlace:
 *                 type: string
 *               journeyBookingDate:
 *                 type: string
 *                 format: date-time
 *               fromDepartureDate:
 *                 type: string
 *                 format: date-time
 *               toArrivalDate:
 *                 type: string
 *                 format: date-time
 *               foodType:
 *                 type: string
 *               billDescription:
 *                 type: string
 *               trainName:
 *                 type: string
 *               class:
 *                 type: string
 *               pnrNumber:
 *                 type: string
 *               trainNumber:
 *                 type: string
 *               busName:
 *                 type: string
 *               flightNumber:
 *                 type: string
 *               airlineId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Journey booking updated
 *       404:
 *         description: Journey booking not found
 *       500:
 *         description: Failed to update journey booking
 */
router.put("/:id", auth, acl("journeyBookings.write"), updateJourneyBooking);

/**
 * @swagger
 * /journey-bookings/{id}:
 *   delete:
 *     summary: Delete a journey booking by ID
 *     tags: [JourneyBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Journey booking ID
 *     responses:
 *       204:
 *         description: Journey booking deleted
 *       404:
 *         description: Journey booking not found
 *       500:
 *         description: Failed to delete journey booking
 */
router.delete(
  "/:id",
  auth,
  acl("journeyBookings.delete"),
  deleteJourneyBooking
);

module.exports = router;
