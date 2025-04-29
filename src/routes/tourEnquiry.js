const express = require("express");
const router = express.Router();
const {
  getTourEnquiries,
  createTourEnquiry,
  getTourEnquiryById,
  updateTourEnquiry,
  deleteTourEnquiry,
} = require("../controllers/tourEnquiryController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: Tour Enquiries
 *   description: Tour enquiry management endpoints
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
 * /tour-enquiries:
 *   get:
 *     summary: Get all tour enquiries with pagination, sorting, and search
 *     tags: [Tour Enquiries]
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
 *         description: Number of tour enquiries per page
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
 *         description: List of all tour enquiries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tourEnquiries:
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
 *                       bookingDetails:
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
 *                 totalTourEnquiries:
 *                   type: integer
 *       500:
 *         description: Failed to fetch tour enquiries
 */
router.get("/", auth, acl("tourEnquiries.read"), getTourEnquiries);

/**
 * @swagger
 * /tour-enquiries:
 *   post:
 *     summary: Create a new tour enquiry
 *     tags: [Tour Enquiries]
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
 *               bookingDetails:
 *                 type: string
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
 *               tourBookingDetails:
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
 *         description: Tour enquiry created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create tour enquiry
 */
router.post("/", auth, acl("tourEnquiries.write"), createTourEnquiry);

/**
 * @swagger
 * /tour-enquiries/{id}:
 *   get:
 *     summary: Get tour enquiry by ID
 *     tags: [Tour Enquiries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Tour enquiry ID
 *     responses:
 *       200:
 *         description: Tour enquiry details
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
 *                 bookingDetails:
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
 *                 tourBookingDetails:
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
 *         description: Tour enquiry not found
 *       500:
 *         description: Failed to fetch tour enquiry
 */
router.get("/:id", auth, acl("tourEnquiries.read"), getTourEnquiryById);

/**
 * @swagger
 * /tour-enquiries/{id}:
 *   put:
 *     summary: Update tour enquiry by ID
 *     tags: [Tour Enquiries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Tour enquiry ID
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
 *               bookingDetails:
 *                 type: string
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
 *               tourBookingDetails:
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
 *         description: Tour enquiry updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Tour enquiry not found
 *       500:
 *         description: Failed to update tour enquiry
 */
router.put("/:id", auth, acl("tourEnquiries.write"), updateTourEnquiry);

/**
 * @swagger
 * /tour-enquiries/{id}:
 *   delete:
 *     summary: Delete tour enquiry by ID
 *     tags: [Tour Enquiries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Tour enquiry ID
 *     responses:
 *       204:
 *         description: Tour enquiry deleted successfully
 *       404:
 *         description: Tour enquiry not found
 *       500:
 *         description: Failed to delete tour enquiry
 */
router.delete("/:id", auth, acl("tourEnquiries.delete"), deleteTourEnquiry);

module.exports = router;