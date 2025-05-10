const express = require("express");
const router = express.Router();
const {
  createVehicleBooking,
  getVehicleBookingById,
  updateVehicleBooking,
  deleteVehicleBooking,
  getAllVehicleBookingsByBookingId,
} = require("../controllers/vehicleBookingController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: VehicleBookings
 *   description: Vehicle booking management endpoints
 */

/**
 * @swagger
 * /vehicle-bookings/booking/{id}:
 *   get:
 *     summary: Get all vehicle bookings by booking ID
 *     tags: [VehicleBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Booking ID to retrieve vehicle bookings for
 *     responses:
 *       200:
 *         description: List of vehicle bookings associated with the booking
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 vehicleBookings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/VehicleBooking'
 *       500:
 *         description: Failed to fetch vehicle bookings
 */
router.get(
  "/booking/:id",
  auth,
  acl("vehicleBookings.read"),
  getAllVehicleBookingsByBookingId
);

/**
 * @swagger
 * /vehicle-bookings/{id}:
 *   post:
 *     summary: Create a new vehicle booking
 *     tags: [VehicleBookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Vehicle booking object to create
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
 *               bookingId:
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
 *         description: Vehicle booking created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VehicleBooking'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create vehicle booking
 */
router.post("/:id", auth, acl("vehicleBookings.write"), createVehicleBooking);

/**
 * @swagger
 * /vehicle-bookings/{id}:
 *   get:
 *     summary: Get a vehicle booking by ID
 *     tags: [VehicleBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Vehicle booking ID
 *     responses:
 *       200:
 *         description: Vehicle booking details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VehicleBooking'
 *       404:
 *         description: Vehicle booking not found
 *       500:
 *         description: Failed to fetch vehicle booking
 */
router.get("/:id", auth, acl("vehicleBookings.read"), getVehicleBookingById);

/**
 * @swagger
 * /vehicle-bookings/{id}:
 *   put:
 *     summary: Update a vehicle booking by ID
 *     tags: [VehicleBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Vehicle booking ID
 *     requestBody:
 *       description: Vehicle booking object with updated information
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VehicleBooking'
 *     responses:
 *       200:
 *         description: Vehicle booking updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VehicleBooking'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Vehicle booking not found
 *       500:
 *         description: Failed to update vehicle booking
 */
router.put("/:id", auth, acl("vehicleBookings.write"), updateVehicleBooking);

/**
 * @swagger
 * /vehicle-bookings/{id}:
 *   delete:
 *     summary: Delete a vehicle booking by ID
 *     tags: [VehicleBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Vehicle booking ID
 *     responses:
 *       204:
 *         description: Vehicle booking deleted successfully
 *       404:
 *         description: Vehicle booking not found
 *       500:
 *         description: Failed to delete vehicle booking
 */
router.delete(
  "/:id",
  auth,
  acl("vehicleBookings.delete"),
  deleteVehicleBooking
);

module.exports = router;
