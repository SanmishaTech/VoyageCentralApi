const express = require("express");
const router = express.Router();
const {
  createGroupClientJourneyBooking,
  getGroupClientJourneyBookingById,
  updateGroupClientJourneyBooking,
  deleteGroupClientJourneyBooking,
  getAllJourneyBookingsByGroupClientBookingId,
} = require("../controllers/groupBooking/groupClientJourneyBookingController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: GroupClientJourneyBookings
 *   description: Group client journey booking management endpoints
 */

/**
 * @swagger
 * /group-client-journey-bookings/group-client/{id}:
 *   get:
 *     summary: Get all group client journey bookings by group client ID
 *     tags: [GroupClientJourneyBookings]
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
 *         description: List of group client journey bookings
 *       500:
 *         description: Failed to fetch group client journey bookings
 */
router.get(
  "/all/:groupClientBookingId",
  auth,
  acl("groupClientJourneyBookings.read"),
  getAllJourneyBookingsByGroupClientBookingId
);

/**
 * @swagger
 * /group-client-journey-bookings/{id}:
 *   get:
 *     summary: Get a group client journey booking by ID
 *     tags: [GroupClientJourneyBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Group client journey booking ID
 *     responses:
 *       200:
 *         description: Group client journey booking details
 *       404:
 *         description: Group client journey booking not found
 *       500:
 *         description: Failed to fetch group client journey booking
 */
router.get(
  "/:journeyBookingId",
  auth,
  acl("groupClientJourneyBookings.read"),
  getGroupClientJourneyBookingById
);

/**
 * @swagger
 * /group-client-journey-bookings/{id}:
 *   post:
 *     summary: Create a new group client journey booking
 *     tags: [GroupClientJourneyBookings]
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
 *         description: Group client journey booking created
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create group client journey booking
 */
router.post(
  "/:groupClientBookingId",
  auth,
  acl("groupClientJourneyBookings.write"),
  createGroupClientJourneyBooking
);

/**
 * @swagger
 * /group-client-journey-bookings/{id}:
 *   put:
 *     summary: Update a group client journey booking by ID
 *     tags: [GroupClientJourneyBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Group client journey booking ID
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
 *         description: Group client journey booking updated
 *       404:
 *         description: Group client journey booking not found
 *       500:
 *         description: Failed to update group client journey booking
 */
router.put(
  "/:journeyBookingId",
  auth,
  acl("groupClientJourneyBookings.write"),
  updateGroupClientJourneyBooking
);

/**
 * @swagger
 * /group-client-journey-bookings/{id}:
 *   delete:
 *     summary: Delete a group client journey booking by ID
 *     tags: [GroupClientJourneyBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Group client journey booking ID
 *     responses:
 *       204:
 *         description: Group client journey booking deleted
 *       404:
 *         description: Group client journey booking not found
 *       500:
 *         description: Failed to delete group client journey booking
 */
router.delete(
  "/:journeyBookingId",
  auth,
  acl("groupClientJourneyBookings.delete"),
  deleteGroupClientJourneyBooking
);

module.exports = router;
