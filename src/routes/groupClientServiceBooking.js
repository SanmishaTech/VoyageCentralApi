const express = require("express");
const router = express.Router();
const {
  createGroupClientServiceBooking,
  getGroupClientServiceBookingById,
  updateGroupClientServiceBooking,
  deleteGroupClientServiceBooking,
  getAllServiceBookingsByGroupClientBookingId,
} = require("../controllers/groupBooking/groupClientServiceBookingController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: GroupClientServiceBookings
 *   description: Group client service booking management endpoints
 */

/**
 * @swagger
 * /group-client-service-bookings/all/{groupClientBookingId}:
 *   get:
 *     summary: Get all service bookings by group client booking ID
 *     tags: [GroupClientServiceBookings]
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
 *         description: List of service bookings for the group client booking
 *       500:
 *         description: Failed to fetch service bookings
 */
router.get(
  "/all/:groupClientBookingId",
  auth,
  acl("groupClientServiceBookings.read"),
  getAllServiceBookingsByGroupClientBookingId
);

/**
 * @swagger
 * /group-client-service-bookings/{groupClientBookingId}:
 *   post:
 *     summary: Create a new group client service booking
 *     tags: [GroupClientServiceBookings]
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
 *               - description
 *             properties:
 *               description:
 *                 type: string
 *               cost:
 *                 type: number
 *                 format: float
 *     responses:
 *       201:
 *         description: Service booking created
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Failed to create service booking
 */
router.post(
  "/:groupClientBookingId",
  auth,
  acl("groupClientServiceBookings.write"),
  createGroupClientServiceBooking
);

/**
 * @swagger
 * /group-client-service-bookings/{serviceBookingId}:
 *   get:
 *     summary: Get a group client service booking by ID
 *     tags: [GroupClientServiceBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceBookingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Service booking ID
 *     responses:
 *       200:
 *         description: Service booking details
 *       404:
 *         description: Service booking not found
 *       500:
 *         description: Failed to fetch service booking
 */
router.get(
  "/:serviceBookingId",
  auth,
  acl("groupClientServiceBookings.read"),
  getGroupClientServiceBookingById
);

/**
 * @swagger
 * /group-client-service-bookings/{serviceBookingId}:
 *   put:
 *     summary: Update a group client service booking
 *     tags: [GroupClientServiceBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceBookingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Service booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *             properties:
 *               description:
 *                 type: string
 *               cost:
 *                 type: number
 *                 format: float
 *     responses:
 *       200:
 *         description: Service booking updated
 *       404:
 *         description: Service booking not found
 *       500:
 *         description: Failed to update service booking
 */
router.put(
  "/:serviceBookingId",
  auth,
  acl("groupClientServiceBookings.write"),
  updateGroupClientServiceBooking
);

/**
 * @swagger
 * /group-client-service-bookings/{serviceBookingId}:
 *   delete:
 *     summary: Delete a group client service booking
 *     tags: [GroupClientServiceBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceBookingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Service booking ID
 *     responses:
 *       204:
 *         description: Service booking deleted
 *       404:
 *         description: Service booking not found
 *       500:
 *         description: Failed to delete service booking
 */
router.delete(
  "/:serviceBookingId",
  auth,
  acl("groupClientServiceBookings.delete"),
  deleteGroupClientServiceBooking
);

module.exports = router;
