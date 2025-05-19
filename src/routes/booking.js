const express = require("express");
const router = express.Router();
const {
  getBookings,
  createBooking,
  getBookingById,
  updateBooking,
  deleteBooking,
  getTourEnquiries,
} = require("../controllers/bookingController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Booking management endpoints
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /bookings:
 *   get:
 *     summary: Get all bookings with pagination, sorting, and search
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of bookings per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for booking number or enquiry status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: id
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *       - in: query
 *         name: fromBookingDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by booking date (start)
 *       - in: query
 *         name: toBookingDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by booking date (end)
 *       - in: query
 *         name: tourTitle
 *         schema:
 *           type: string
 *         description: Filter by tour title
 *       - in: query
 *         name: clientName
 *         schema:
 *           type: string
 *         description: Filter by client name
 *     responses:
 *       200:
 *         description: List of all bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bookings:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       bookingNumber:
 *                         type: string
 *                       bookingDate:
 *                         type: string
 *                         format: date-time
 *                       journeyDate:
 *                         type: string
 *                         format: date-time
 *                       departureDate:
 *                         type: string
 *                         format: date-time
 *                       budgetField:
 *                         type: string
 *                       clientId:
 *                         type: integer
 *                       numberOfAdults:
 *                         type: integer
 *                       numberOfChildren5To11:
 *                         type: integer
 *                       numberOfChildrenUnder5:
 *                         type: integer
 *                       branchId:
 *                         type: integer
 *                       tourId:
 *                         type: integer
 *                       bookingDetail:
 *                         type: string
 *                       isJourney:
 *                         type: boolean
 *                       isHotel:
 *                         type: boolean
 *                       isVehicle:
 *                         type: boolean
 *                       isPackage:
 *                         type: boolean
 *                       enquiryStatus:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalBookings:
 *                   type: integer
 *       500:
 *         description: Failed to fetch bookings
 */
router.get("/", auth, acl("bookings.read"), getBookings);

/**
 * @swagger
 * /bookings/enquiries:
 *   get:
 *     summary: Get all bookings with pagination, sorting, and search
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of bookings per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for booking number or enquiry status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: id
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *       - in: query
 *         name: fromBookingDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by booking date (start)
 *       - in: query
 *         name: toBookingDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by booking date (end)
 *       - in: query
 *         name: tourTitle
 *         schema:
 *           type: string
 *         description: Filter by tour title
 *       - in: query
 *         name: clientName
 *         schema:
 *           type: string
 *         description: Filter by client name
 *     responses:
 *       200:
 *         description: List of all bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bookings:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       bookingNumber:
 *                         type: string
 *                       bookingDate:
 *                         type: string
 *                         format: date-time
 *                       journeyDate:
 *                         type: string
 *                         format: date-time
 *                       departureDate:
 *                         type: string
 *                         format: date-time
 *                       budgetField:
 *                         type: string
 *                       clientId:
 *                         type: integer
 *                       numberOfAdults:
 *                         type: integer
 *                       numberOfChildren5To11:
 *                         type: integer
 *                       numberOfChildrenUnder5:
 *                         type: integer
 *                       branchId:
 *                         type: integer
 *                       tourId:
 *                         type: integer
 *                       bookingDetail:
 *                         type: string
 *                       isJourney:
 *                         type: boolean
 *                       isHotel:
 *                         type: boolean
 *                       isVehicle:
 *                         type: boolean
 *                       isPackage:
 *                         type: boolean
 *                       enquiryStatus:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalBookings:
 *                   type: integer
 *       500:
 *         description: Failed to fetch bookings
 */
router.get("/enquiries", auth, acl("bookings.read"), getTourEnquiries);

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookingDate:
 *                 type: string
 *                 format: date-time
 *               journeyDate:
 *                 type: string
 *                 format: date-time
 *               departureDate:
 *                 type: string
 *                 format: date-time
 *               budgetField:
 *                 type: string
 *               clientId:
 *                 type: integer
 *               numberOfAdults:
 *                 type: integer
 *               numberOfChildren5To11:
 *                 type: integer
 *               numberOfChildrenUnder5:
 *                 type: integer
 *               branchId:
 *                 type: integer
 *               tourId:
 *                 type: integer
 *               isJourney:
 *                 type: boolean
 *               isHotel:
 *                 type: boolean
 *               isVehicle:
 *                 type: boolean
 *               isPackage:
 *                 type: boolean
 *               enquiryStatus:
 *                 type: string
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create booking
 */
router.post("/", auth, acl("bookings.write"), createBooking);

/**
 * @swagger
 * /bookings/{id}:
 *   get:
 *     summary: Get booking by ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 bookingNumber:
 *                   type: string
 *                 bookingDate:
 *                   type: string
 *                   format: date-time
 *                 journeyDate:
 *                   type: string
 *                   format: date-time
 *                 departureDate:
 *                   type: string
 *                   format: date-time
 *                 budgetField:
 *                   type: string
 *                 clientId:
 *                   type: integer
 *                 numberOfAdults:
 *                   type: integer
 *                 numberOfChildren5To11:
 *                   type: integer
 *                 numberOfChildrenUnder5:
 *                   type: integer
 *                 branchId:
 *                   type: integer
 *                 tourId:
 *                   type: integer
 *                 bookingDetail:
 *                   type: string
 *                 isJourney:
 *                   type: boolean
 *                 isHotel:
 *                   type: boolean
 *                 isVehicle:
 *                   type: boolean
 *                 isPackage:
 *                   type: boolean
 *                 enquiryStatus:
 *                   type: string
 *                 bookingDetails:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       day:
 *                         type: integer
 *                       date:
 *                         type: string
 *                         format: date-time
 *                       description:
 *                         type: string
 *                       cityId:
 *                         type: integer
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Failed to fetch booking
 */
router.get("/:id", auth, acl("bookings.read"), getBookingById);
/**
 * @swagger
 * /bookings/{id}:
 *   put:
 *     summary: Update booking by ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookingDate:
 *                 type: string
 *                 format: date-time
 *               journeyDate:
 *                 type: string
 *                 format: date-time
 *               departureDate:
 *                 type: string
 *                 format: date-time
 *               budgetField:
 *                 type: string
 *               clientId:
 *                 type: integer
 *               numberOfAdults:
 *                 type: integer
 *               numberOfChildren5To11:
 *                 type: integer
 *               numberOfChildrenUnder5:
 *                 type: integer
 *               branchId:
 *                 type: integer
 *               tourId:
 *                 type: integer
 *               isJourney:
 *                 type: boolean
 *               isHotel:
 *                 type: boolean
 *               isVehicle:
 *                 type: boolean
 *               isPackage:
 *                 type: boolean
 *               enquiryStatus:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Failed to update booking
 */
router.put("/:id", auth, acl("bookings.write"), updateBooking);

/**
 * @swagger
 * /bookings/{id}:
 *   delete:
 *     summary: Delete booking by ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Booking ID
 *     responses:
 *       204:
 *         description: Booking deleted successfully
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Failed to delete booking
 */
router.delete("/:id", auth, acl("bookings.delete"), deleteBooking);

module.exports = router;
