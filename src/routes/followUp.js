const express = require("express");
const router = express.Router();
const {
  createFollowUp,
  getFollowUpsById,
  getFollowUpsByGroupBookingId,
  createFollowUpByGroupBookingId,
} = require("../controllers/followUpController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: FollowUps
 *   description: Follow-up management endpoints
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
 * /follow-ups/booking/{id}:
 *   get:
 *     summary: Get all follow-ups for a booking
 *     tags: [FollowUps]
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
 *         description: List of follow-ups for the booking
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 followUps:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       bookingId:
 *                         type: integer
 *                       followUpDate:
 *                         type: string
 *                         format: date-time
 *                       nextFollowUpDate:
 *                         type: string
 *                         format: date-time
 *                       remarks:
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
 *                 totalFollowUps:
 *                   type: integer
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Failed to fetch follow-ups
 */
router.get("/booking/:id", auth, acl("followUps.read"), getFollowUpsById);

/**
 * @swagger
 * /follow-ups/group-booking/{groupBookingId}:
 *   get:
 *     summary: Get all follow-ups for a booking
 *     tags: [FollowUps]
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
 *         description: List of follow-ups for the booking
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 followUps:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       bookingId:
 *                         type: integer
 *                       followUpDate:
 *                         type: string
 *                         format: date-time
 *                       nextFollowUpDate:
 *                         type: string
 *                         format: date-time
 *                       remarks:
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
 *                 totalFollowUps:
 *                   type: integer
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Failed to fetch follow-ups
 */
router.get(
  "/group-booking/:groupBookingId",
  auth,
  acl("followUps.read"),
  getFollowUpsByGroupBookingId
);

/**
 * @swagger
 * /follow-ups/{id}:
 *   post:
 *     summary: Create a new follow-up for a booking
 *     tags: [FollowUps]
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
 *               followUpDate:
 *                 type: string
 *                 format: date-time
 *                 description: Date of the follow-up
 *               nextFollowUpDate:
 *                 type: string
 *                 format: date-time
 *                 description: Date of the next follow-up
 *               remarks:
 *                 type: string
 *                 description: Remarks for the follow-up
 *                 maxLength: 180
 *     responses:
 *       201:
 *         description: Follow-up created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 bookingId:
 *                   type: integer
 *                 followUpDate:
 *                   type: string
 *                   format: date-time
 *                 nextFollowUpDate:
 *                   type: string
 *                   format: date-time
 *                 remarks:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create follow-up
 */
router.post("/:id", auth, acl("followUps.write"), createFollowUp);

/**
 * @swagger
 * /follow-ups/group-booking/{groupBookingId}:
 *   post:
 *     summary: Create a new follow-up for a booking
 *     tags: [FollowUps]
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
 *               followUpDate:
 *                 type: string
 *                 format: date-time
 *                 description: Date of the follow-up
 *               nextFollowUpDate:
 *                 type: string
 *                 format: date-time
 *                 description: Date of the next follow-up
 *               remarks:
 *                 type: string
 *                 description: Remarks for the follow-up
 *                 maxLength: 180
 *     responses:
 *       201:
 *         description: Follow-up created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 bookingId:
 *                   type: integer
 *                 followUpDate:
 *                   type: string
 *                   format: date-time
 *                 nextFollowUpDate:
 *                   type: string
 *                   format: date-time
 *                 remarks:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create follow-up
 */
router.post(
  "/group-booking/:groupBookingId",
  auth,
  acl("followUps.write"),
  createFollowUpByGroupBookingId
);

module.exports = router;
