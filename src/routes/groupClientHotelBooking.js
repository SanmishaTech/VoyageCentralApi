const express = require("express");
const router = express.Router();
const {
  createGroupClientHotelBooking,
  getGroupClientHotelBookingById,
  updateGroupClientHotelBooking,
  deleteGroupClientHotelBooking,
  getAllHotelBookingsByGroupClientBookingId,
} = require("../controllers/groupBooking/groupClientHotelBookingController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: GroupClientHotelBookings
 *   description: Group client hotel booking management endpoints
 */

/**
 * @swagger
 * /group-client-hotel-bookings/{groupClientBookingId}:
 *   get:
 *     summary: Get all group client hotel bookings by group client ID
 *     tags: [GroupClientHotelBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Group client ID
 *     responses:
 *       200:
 *         description: List of group client hotel bookings
 *       500:
 *         description: Failed to fetch group client hotel bookings
 */
router.get(
  "/all/:groupClientBookingId",
  auth,
  acl("groupClientHotelBookings.read"),
  getAllHotelBookingsByGroupClientBookingId
);

/**
 * @swagger
 * /group-client-hotel-bookings/{groupClientBookingId}:
 *   post:
 *     summary: Create a new group client hotel booking
 *     tags: [GroupClientHotelBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Group client ID
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
 *               groupClientId:
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
 *         description: Group client hotel booking created
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Failed to create group client hotel booking
 */
router.post(
  "/:groupClientBookingId",
  auth,
  acl("groupClientHotelBookings.write"),
  createGroupClientHotelBooking
);

/**
 * @swagger
 * /group-client-hotel-bookings/{id}:
 *   get:
 *     summary: Get a group client hotel booking by ID
 *     tags: [GroupClientHotelBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Group client hotel booking ID
 *     responses:
 *       200:
 *         description: Group client hotel booking details
 *       404:
 *         description: Group client hotel booking not found
 *       500:
 *         description: Failed to fetch group client hotel booking
 */
router.get(
  "/:hotelBookingId",
  auth,
  acl("groupClientHotelBookings.read"),
  getGroupClientHotelBookingById
);

/**
 * @swagger
 * /group-client-hotel-bookings/{id}:
 *   put:
 *     summary: Update a group client hotel booking
 *     tags: [GroupClientHotelBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Group client hotel booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GroupClientHotelBooking'
 *     responses:
 *       200:
 *         description: Group client hotel booking updated
 *       404:
 *         description: Group client hotel booking not found
 *       500:
 *         description: Failed to update group client hotel booking
 */
router.put(
  "/:hotelBookingId",
  auth,
  acl("groupClientHotelBookings.write"),
  updateGroupClientHotelBooking
);

/**
 * @swagger
 * /group-client-hotel-bookings/{id}:
 *   delete:
 *     summary: Delete a group client hotel booking
 *     tags: [GroupClientHotelBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Group client hotel booking ID
 *     responses:
 *       204:
 *         description: Group client hotel booking deleted
 *       404:
 *         description: Group client hotel booking not found
 *       500:
 *         description: Failed to delete group client hotel booking
 */
router.delete(
  "/:hotelBookingId",
  auth,
  acl("groupClientHotelBookings.delete"),
  deleteGroupClientHotelBooking
);

module.exports = router;
