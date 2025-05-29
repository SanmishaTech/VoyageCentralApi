const express = require("express");
const router = express.Router();
const {
  getGroupClientByGroupBookingId,
  createGroupClientBooking,
  getGroupClientBookingById,
  updateGroupClientBooking,
  deleteGroupClientBooking,
} = require("../controllers/groupBooking/groupClientBookingController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: GroupClientBookings
 *   description: Group client booking management endpoints
 */

/**
 * @swagger
 * /group-client-bookings/{groupBookingId}:
 *   get:
 *     summary: Get all group client bookings with pagination
 *     tags: [GroupClientBookings]
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
 *         description: Number of group client bookings per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for notes
 *     responses:
 *       200:
 *         description: List of all group client bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 groupClients:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       groupBookingId:
 *                         type: integer
 *                       clientId:
 *                         type: integer
 *                       bookingDate:
 *                         type: string
 *                         format: date-time
 *                       numberOfAdults:
 *                         type: integer
 *                       numberOfChildren5To11:
 *                         type: integer
 *                       numberOfChildrenUnder5:
 *                         type: integer
 *                       totalMember:
 *                         type: integer
 *                       tourCost:
 *                         type: number
 *                         format: float
 *                       notes:
 *                         type: string
 *                       isJourney:
 *                         type: boolean
 *                       isHotel:
 *                         type: boolean
 *                       isVehicle:
 *                         type: boolean
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
 *                 totalGroupClients:
 *                   type: integer
 *       500:
 *         description: Failed to fetch group client bookings
 */
router.get(
  "/:groupBookingId",
  auth,
  acl("groupClientBookings.read"),
  getGroupClientByGroupBookingId
);

/**
 * @swagger
 * /group-client-bookings/{groupClientId}:
 *   post:
 *     summary: Create a new group client booking
 *     tags: [GroupClientBookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               groupBookingId:
 *                 type: integer
 *               clientId:
 *                 type: integer
 *               bookingDate:
 *                 type: string
 *                 format: date-time
 *               numberOfAdults:
 *                 type: integer
 *               numberOfChildren5To11:
 *                 type: integer
 *               numberOfChildrenUnder5:
 *                 type: integer
 *               tourCost:
 *                 type: number
 *                 format: float
 *               notes:
 *                 type: string
 *               isJourney:
 *                 type: boolean
 *               isHotel:
 *                 type: boolean
 *               isVehicle:
 *                 type: boolean
 *               groupClientMembers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     gender:
 *                       type: string
 *                     aadharNo:
 *                       type: string
 *                     relation:
 *                       type: string
 *                     dateOfBirth:
 *                       type: string
 *                       format: date-time
 *                     anniversaryDate:
 *                       type: string
 *                       format: date-time
 *                     foodType:
 *                       type: string
 *                     mobile:
 *                       type: string
 *                     email:
 *                       type: string
 *                     passportNumber:
 *                       type: string
 *                     panNumber:
 *                       type: string
 *     responses:
 *       201:
 *         description: Group client booking created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create group client booking
 */
router.post(
  "/:groupClientId",
  auth,
  acl("groupClientBookings.write"),
  createGroupClientBooking
);

/**
 * @swagger
 * /group-client-bookings/{groupClientId}:
 *   get:
 *     summary: Get group client booking by ID
 *     tags: [GroupClientBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Group client booking ID
 *     responses:
 *       200:
 *         description: Group client booking details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 groupBookingId:
 *                   type: integer
 *                 clientId:
 *                   type: integer
 *                 bookingDate:
 *                   type: string
 *                   format: date-time
 *                 numberOfAdults:
 *                   type: integer
 *                 numberOfChildren5To11:
 *                   type: integer
 *                 numberOfChildrenUnder5:
 *                   type: integer
 *                 totalMember:
 *                   type: integer
 *                 tourCost:
 *                   type: number
 *                   format: float
 *                 notes:
 *                   type: string
 *                 isJourney:
 *                   type: boolean
 *                 isHotel:
 *                   type: boolean
 *                 isVehicle:
 *                   type: boolean
 *                 groupClientMembers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       gender:
 *                         type: string
 *                       aadharNo:
 *                         type: string
 *                       relation:
 *                         type: string
 *                       dateOfBirth:
 *                         type: string
 *                         format: date-time
 *                       anniversaryDate:
 *                         type: string
 *                         format: date-time
 *                       foodType:
 *                         type: string
 *                       mobile:
 *                         type: string
 *                       email:
 *                         type: string
 *                       passportNumber:
 *                         type: string
 *                       panNumber:
 *                         type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Group client booking not found
 *       500:
 *         description: Failed to fetch group client booking
 */
router.get(
  "/:groupClientId",
  auth,
  acl("groupClientBookings.read"),
  getGroupClientBookingById
);

/**
 * @swagger
 * /group-client-bookings/{groupClientId}:
 *   put:
 *     summary: Update group client booking by ID
 *     tags: [GroupClientBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Group client booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clientId:
 *                 type: integer
 *               bookingDate:
 *                 type: string
 *                 format: date-time
 *               numberOfAdults:
 *                 type: integer
 *               numberOfChildren5To11:
 *                 type: integer
 *               numberOfChildrenUnder5:
 *                 type: integer
 *               tourCost:
 *                 type: number
 *                 format: float
 *               notes:
 *                 type: string
 *               isJourney:
 *                 type: boolean
 *               isHotel:
 *                 type: boolean
 *               isVehicle:
 *                 type: boolean
 *               groupClientMembers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     gender:
 *                       type: string
 *                     aadharNo:
 *                       type: string
 *                     relation:
 *                       type: string
 *                     dateOfBirth:
 *                       type: string
 *                       format: date-time
 *                     anniversaryDate:
 *                       type: string
 *                       format: date-time
 *                     foodType:
 *                       type: string
 *                     mobile:
 *                       type: string
 *                     email:
 *                       type: string
 *                     passportNumber:
 *                       type: string
 *                     panNumber:
 *                       type: string
 *     responses:
 *       200:
 *         description: Group client booking updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Group client booking not found
 *       500:
 *         description: Failed to update group client booking
 */
router.put(
  "/:groupClientId",
  auth,
  acl("groupClientBookings.write"),
  updateGroupClientBooking
);

/**
 * @swagger
 * /group-client-bookings/{id}:
 *   delete:
 *     summary: Delete group client booking by ID
 *     tags: [GroupClientBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Group client booking ID
 *     responses:
 *       204:
 *         description: Group client booking deleted successfully
 *       404:
 *         description: Group client booking not found
 *       500:
 *         description: Failed to delete group client booking
 */
router.delete(
  "/:groupClientId",
  auth,
  acl("groupClientBookings.delete"),
  deleteGroupClientBooking
);

module.exports = router;
