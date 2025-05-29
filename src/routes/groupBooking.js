const express = require("express");
const router = express.Router();
const {
  getGroupBookings,
  createGroupBooking,
  getGroupBookingById,
  updateGroupBooking,
  deleteGroupBooking,
  getGroupBookingEnquiries,
} = require("../controllers/groupBooking/groupBookingController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: GroupBookings
 *   description: Group booking management endpoints
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
 * /group-bookings:
 *   get:
 *     summary: Get all group bookings with pagination, sorting, and search
 *     tags: [GroupBookings]
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
 *         description: Number of group bookings per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for group booking number, branch, or tour title
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
 *         name: fromGBookingDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by group booking date (start)
 *       - in: query
 *         name: toBookingDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by group booking date (end)
 *       - in: query
 *         name: tourTitle
 *         schema:
 *           type: string
 *         description: Filter by tour title
 *     responses:
 *       200:
 *         description: List of all group bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 groupBookings:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       groupBookingNumber:
 *                         type: string
 *                       groupBookingDate:
 *                         type: string
 *                         format: date-time
 *                       journeyDate:
 *                         type: string
 *                         format: date-time
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
 *                       followUpDate:
 *                         type: string
 *                         format: date-time
 *                       remarks:
 *                         type: string
 *                       enquiryStatus:
 *                         type: string
 *                       bookingType:
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
 *                 totalGroupBookings:
 *                   type: integer
 *       500:
 *         description: Failed to fetch group bookings
 */
router.get("/", auth, acl("groupBookings.read"), getGroupBookings);

/**
 * @swagger
 * /group-bookings/enquiries:
 *   get:
 *     summary: Get all group bookings with pagination, sorting, and search
 *     tags: [GroupBookings]
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
 *         description: Number of group bookings per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for group booking number, branch, or tour title
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
 *         name: fromGBookingDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by group booking date (start)
 *       - in: query
 *         name: toBookingDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by group booking date (end)
 *       - in: query
 *         name: tourTitle
 *         schema:
 *           type: string
 *         description: Filter by tour title
 *     responses:
 *       200:
 *         description: List of all group bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 groupBookings:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       groupBookingNumber:
 *                         type: string
 *                       groupBookingDate:
 *                         type: string
 *                         format: date-time
 *                       journeyDate:
 *                         type: string
 *                         format: date-time
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
 *                       followUpDate:
 *                         type: string
 *                         format: date-time
 *                       remarks:
 *                         type: string
 *                       enquiryStatus:
 *                         type: string
 *                       bookingType:
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
 *                 totalGroupBookings:
 *                   type: integer
 *       500:
 *         description: Failed to fetch group bookings
 */
router.get(
  "/enquiries",
  auth,
  acl("groupBookings.read"),
  getGroupBookingEnquiries
);

/**
 * @swagger
 * /group-bookings/enquiries:
 *   get:
 *     summary: Get all group booking enquiries with pagination, sorting, and search
 *     tags: [GroupBookings]
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
 *         description: Number of group bookings per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for group booking number, branch, or tour title
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
 *         description: Filter by group booking date (start)
 *       - in: query
 *         name: toBookingDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by group booking date (end)
 *       - in: query
 *         name: tourTitle
 *         schema:
 *           type: string
 *         description: Filter by tour title
 *     responses:
 *       200:
 *         description: List of all group booking enquiries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 groupBookings:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       groupBookingNumber:
 *                         type: string
 *                       groupBookingDate:
 *                         type: string
 *                         format: date-time
 *                       journeyDate:
 *                         type: string
 *                         format: date-time
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
 *                       followUpDate:
 *                         type: string
 *                         format: date-time
 *                       remarks:
 *                         type: string
 *                       enquiryStatus:
 *                         type: string
 *                       bookingType:
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
 *                 totalGroupBookings:
 *                   type: integer
 *       500:
 *         description: Failed to fetch group booking enquiries
 */
router.get(
  "/enquiries",
  auth,
  acl("groupBookings.read"),
  getGroupBookingEnquiries
);

/**
 * @swagger
 * /group-bookings:
 *   post:
 *     summary: Create a new group booking
 *     tags: [GroupBookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               groupBookingDate:
 *                 type: string
 *                 format: date-time
 *               journeyDate:
 *                 type: string
 *                 format: date-time
 *               branchId:
 *                 type: integer
 *               tourId:
 *                 type: integer
 *               bookingDetail:
 *                 type: string
 *               isJourney:
 *                 type: boolean
 *               isHotel:
 *                 type: boolean
 *               isVehicle:
 *                 type: boolean
 *               bookingType:
 *                 type: string
 *               groupBookingDetails:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     day:
 *                       type: integer
 *                     date:
 *                       type: string
 *                       format: date-time
 *                     description:
 *                       type: string
 *                     cityId:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Group booking created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create group booking
 */
router.post("/", auth, acl("groupBookings.write"), createGroupBooking);

/**
 * @swagger
 * /group-bookings/{id}:
 *   get:
 *     summary: Get group booking by ID
 *     tags: [GroupBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Group booking ID
 *     responses:
 *       200:
 *         description: Group booking details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 groupBookingNumber:
 *                   type: string
 *                 groupBookingDate:
 *                   type: string
 *                   format: date-time
 *                 journeyDate:
 *                   type: string
 *                   format: date-time
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
 *                 followUpDate:
 *                   type: string
 *                   format: date-time
 *                 remarks:
 *                   type: string
 *                 enquiryStatus:
 *                   type: string
 *                 bookingType:
 *                   type: string
 *                 groupBookingDetails:
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
 *         description: Group booking not found
 *       500:
 *         description: Failed to fetch group booking
 */
router.get("/:id", auth, acl("groupBookings.read"), getGroupBookingById);

/**
 * @swagger
 * /group-bookings/{id}:
 *   put:
 *     summary: Update group booking by ID
 *     tags: [GroupBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Group booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               groupBookingDate:
 *                 type: string
 *                 format: date-time
 *               journeyDate:
 *                 type: string
 *                 format: date-time
 *               branchId:
 *                 type: integer
 *               tourId:
 *                 type: integer
 *               bookingDetail:
 *                 type: string
 *               isJourney:
 *                 type: boolean
 *               isHotel:
 *                 type: boolean
 *               isVehicle:
 *                 type: boolean
 *               bookingType:
 *                 type: string
 *               groupBookingDetails:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     day:
 *                       type: integer
 *                     date:
 *                       type: string
 *                       format: date-time
 *                     description:
 *                       type: string
 *                     cityId:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Group booking updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Group booking not found
 *       500:
 *         description: Failed to update group booking
 */
router.put("/:id", auth, acl("groupBookings.write"), updateGroupBooking);

/**
 * @swagger
 * /group-bookings/{id}:
 *   delete:
 *     summary: Delete group booking by ID
 *     tags: [GroupBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Group booking ID
 *     responses:
 *       204:
 *         description: Group booking deleted successfully
 *       404:
 *         description: Group booking not found
 *       500:
 *         description: Failed to delete group booking
 */
router.delete("/:id", auth, acl("groupBookings.delete"), deleteGroupBooking);

module.exports = router;
