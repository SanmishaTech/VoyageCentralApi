const express = require("express");
const router = express.Router();
const {
  createServiceBooking,
  getServiceBookingById,
  updateServiceBooking,
  deleteServiceBooking,
  getAllServiceBookingsByBookingId,
} = require("../controllers/serviceBookingController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: ServiceBookings
 *   description: Service booking management endpoints
 */

/**
 * @swagger
 * /service-bookings/booking/{id}:
 *   get:
 *     summary: Get all service bookings by booking ID
 *     tags: [ServiceBookings]
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
 *         description: List of service bookings for the booking
 *       500:
 *         description: Failed to fetch service bookings
 */
router.get(
  "/booking/:id",
  auth,
  acl("serviceBookings.read"),
  getAllServiceBookingsByBookingId
);

/**
 * @swagger
 * /service-bookings/{id}:
 *   post:
 *     summary: Create a new service booking
 *     tags: [ServiceBookings]
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
router.post("/:id", auth, acl("serviceBookings.write"), createServiceBooking);

/**
 * @swagger
 * /service-bookings/{id}:
 *   get:
 *     summary: Get a service booking by ID
 *     tags: [ServiceBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
router.get("/:id", auth, acl("serviceBookings.read"), getServiceBookingById);

/**
 * @swagger
 * /service-bookings/{id}:
 *   put:
 *     summary: Update a service booking
 *     tags: [ServiceBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
router.put("/:id", auth, acl("serviceBookings.write"), updateServiceBooking);

/**
 * @swagger
 * /service-bookings/{id}:
 *   delete:
 *     summary: Delete a service booking
 *     tags: [ServiceBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
  "/:id",
  auth,
  acl("serviceBookings.delete"),
  deleteServiceBooking
);

module.exports = router;
