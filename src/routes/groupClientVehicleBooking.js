const express = require("express");
const router = express.Router();
const {
  createGroupClientVehicleBooking,
  getGroupClientVehicleBookingById,
  updateGroupClientVehicleBooking,
  deleteGroupClientVehicleBooking,
  getAllVehicleBookingsByGroupClientBookingId,
} = require("../controllers/groupBooking/groupClientVehicleBookingController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: GroupClientVehicleBookings
 *   description: Group client vehicle booking management endpoints
 */

/**
 * @swagger
 * /group-client-vehicle-bookings/all/{groupClientBookingId}:
 *   get:
 *     summary: Get all group client vehicle bookings by group client ID
 *     tags: [GroupClientVehicleBookings]
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
 *         description: List of group client vehicle bookings
 *       500:
 *         description: Failed to fetch group client vehicle bookings
 */
router.get(
  "/all/:groupClientBookingId",
  auth,
  acl("groupClientVehicleBookings.read"),
  getAllVehicleBookingsByGroupClientBookingId
);

/**
 * @swagger
 * /group-client-vehicle-bookings/{groupClientBookingId}:
 *   post:
 *     summary: Create a new group client vehicle booking
 *     tags: [GroupClientVehicleBookings]
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
 *               - vehicleHrvNumber
 *               - vehicleBookingDate
 *               - vehicleId
 *               - numberOfVehicles
 *               - fromDate
 *               - toDate
 *               - days
 *               - cityId
 *               - agentId
 *               - pickupPlace
 *             properties:
 *               groupClientId:
 *                 type: integer
 *               vehicleHrvNumber:
 *                 type: string
 *               vehicleBookingDate:
 *                 type: string
 *                 format: date-time
 *               vehicleId:
 *                 type: integer
 *               numberOfVehicles:
 *                 type: integer
 *               fromDate:
 *                 type: string
 *                 format: date-time
 *               toDate:
 *                 type: string
 *                 format: date-time
 *               days:
 *                 type: integer
 *               cityId:
 *                 type: integer
 *               agentId:
 *                 type: integer
 *               pickupPlace:
 *                 type: string
 *               terms:
 *                 type: string
 *               specialRequest:
 *                 type: string
 *               vehicleNote:
 *                 type: string
 *               specialNote:
 *                 type: string
 *               summaryNote:
 *                 type: string
 *               billDescription:
 *                 type: string
 *     responses:
 *       201:
 *         description: Group client vehicle booking created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create group client vehicle booking
 */
router.post(
  "/:groupClientBookingId",
  auth,
  acl("groupClientVehicleBookings.write"),
  createGroupClientVehicleBooking
);

/**
 * @swagger
 * /group-client-vehicle-bookings/{vehicleBookingId}:
 *   get:
 *     summary: Get a group client vehicle booking by ID
 *     tags: [GroupClientVehicleBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Group client vehicle booking ID
 *     responses:
 *       200:
 *         description: Group client vehicle booking details
 *       404:
 *         description: Group client vehicle booking not found
 *       500:
 *         description: Failed to fetch group client vehicle booking
 */
router.get(
  "/:vehicleBookingId",
  auth,
  acl("groupClientVehicleBookings.read"),
  getGroupClientVehicleBookingById
);

/**
 * @swagger
 * /group-client-vehicle-bookings/{vehicleBookingId}:
 *   put:
 *     summary: Update a group client vehicle booking by ID
 *     tags: [GroupClientVehicleBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Group client vehicle booking ID
 *     requestBody:
 *       description: Group client vehicle booking object with updated information
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vehicleHrvNumber:
 *                 type: string
 *               vehicleBookingDate:
 *                 type: string
 *                 format: date-time
 *               vehicleId:
 *                 type: integer
 *               numberOfVehicles:
 *                 type: integer
 *               fromDate:
 *                 type: string
 *                 format: date-time
 *               toDate:
 *                 type: string
 *                 format: date-time
 *               days:
 *                 type: integer
 *               cityId:
 *                 type: integer
 *               agentId:
 *                 type: integer
 *               pickupPlace:
 *                 type: string
 *               terms:
 *                 type: string
 *               specialRequest:
 *                 type: string
 *               vehicleNote:
 *                 type: string
 *               specialNote:
 *                 type: string
 *               summaryNote:
 *                 type: string
 *               billDescription:
 *                 type: string
 *     responses:
 *       200:
 *         description: Group client vehicle booking updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Group client vehicle booking not found
 *       500:
 *         description: Failed to update group client vehicle booking
 */
router.put(
  "/:vehicleBookingId",
  auth,
  acl("groupClientVehicleBookings.write"),
  updateGroupClientVehicleBooking
);

/**
 * @swagger
 * /group-client-vehicle-bookings/{id}:
 *   delete:
 *     summary: Delete a group client vehicle booking by ID
 *     tags: [GroupClientVehicleBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Group client vehicle booking ID
 *     responses:
 *       204:
 *         description: Group client vehicle booking deleted successfully
 *       404:
 *         description: Group client vehicle booking not found
 *       500:
 *         description: Failed to delete group client vehicle booking
 */
router.delete(
  "/:vehicleBookingId",
  auth,
  acl("groupClientVehicleBookings.delete"),
  deleteGroupClientVehicleBooking
);

module.exports = router;
