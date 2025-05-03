const express = require("express");
const router = express.Router();
const {
  createHotelBooking,
  getHotelBookingById,
  updateHotelBooking,
  deleteHotelBooking,
  getAllHotelBookingsByBookingId,
} = require("../controllers/hotelBookingController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: HotelBookings
 *   description: Hotel booking management endpoints
 */

/**
 * @swagger
 * /hotel-bookings/booking/{id}:
 *   get:
 *     summary: Get all hotel bookings by booking ID
 *     tags: [HotelBookings]
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
 *         description: List of hotel bookings for the booking
 *       500:
 *         description: Failed to fetch hotel bookings
 */
router.get(
  "/booking/:id",
  auth,
  acl("hotelBookings.read"),
  getAllHotelBookingsByBookingId
);

/**
 * @swagger
 * /hotel-bookings:
 *   post:
 *     summary: Create a new hotel booking
 *     tags: [HotelBookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hrvNumber
 *               - partyComingFrom
 *               - checkInDate
 *               - checkOutDate
 *               - cityId
 *               - hotelId
 *               - hotelBookingDate
 *             properties:
 *               bookingId:
 *                 type: integer
 *               hrvNumber:
 *                 type: integer
 *               partyComingFrom:
 *                 type: string
 *               checkInDate:
 *                 type: string
 *                 format: date-time
 *               checkOutDate:
 *                 type: string
 *                 format: date-time
 *               nights:
 *                 type: integer
 *               cityId:
 *                 type: integer
 *               hotelId:
 *                 type: integer
 *               plan:
 *                 type: string
 *               rooms:
 *                 type: integer
 *               accommodationId:
 *                 type: integer
 *               tariffPackage:
 *                 type: string
 *               accommodationNote:
 *                 type: string
 *               extraBed:
 *                 type: boolean
 *               beds:
 *                 type: integer
 *               extraBedCost:
 *                 type: number
 *                 format: float
 *               hotelBookingDate:
 *                 type: string
 *                 format: date-time
 *               bookingConfirmedBy:
 *                 type: string
 *               confirmationNumber:
 *                 type: string
 *               billingInstructions:
 *                 type: string
 *               specialRequirement:
 *                 type: string
 *               notes:
 *                 type: string
 *               billDescription:
 *                 type: string
 *     responses:
 *       201:
 *         description: Hotel booking created
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Failed to create hotel booking
 */
router.post("/", auth, acl("hotelBookings.write"), createHotelBooking);

/**
 * @swagger
 * /hotel-bookings/{id}:
 *   get:
 *     summary: Get a hotel booking by ID
 *     tags: [HotelBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Hotel booking ID
 *     responses:
 *       200:
 *         description: Hotel booking details
 *       404:
 *         description: Hotel booking not found
 *       500:
 *         description: Failed to fetch hotel booking
 */
router.get("/:id", auth, acl("hotelBookings.read"), getHotelBookingById);

/**
 * @swagger
 * /hotel-bookings/{id}:
 *   put:
 *     summary: Update a hotel booking
 *     tags: [HotelBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Hotel booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HotelBooking'
 *     responses:
 *       200:
 *         description: Hotel booking updated
 *       404:
 *         description: Hotel booking not found
 *       500:
 *         description: Failed to update hotel booking
 */
router.put("/:id", auth, acl("hotelBookings.write"), updateHotelBooking);

/**
 * @swagger
 * /hotel-bookings/{id}:
 *   delete:
 *     summary: Delete a hotel booking
 *     tags: [HotelBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Hotel booking ID
 *     responses:
 *       204:
 *         description: Hotel booking deleted
 *       404:
 *         description: Hotel booking not found
 *       500:
 *         description: Failed to delete hotel booking
 */
router.delete("/:id", auth, acl("hotelBookings.delete"), deleteHotelBooking);

module.exports = router;
