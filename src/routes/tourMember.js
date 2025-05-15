const express = require("express");
const router = express.Router();
const {
  createTourMember,
  getTourMemberById,
  updateTourMember,
  deleteTourMember,
  getAllTourMembersByBookingId,
} = require("../controllers/tourMemberController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: TourMembers
 *   description: Tour member management endpoints
 */

/**
 * @swagger
 * /tour-members/booking/{id}:
 *   get:
 *     summary: Get all tour members for a given booking ID
 *     tags: [TourMembers]
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
 *         description: List of tour members
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tourMembers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TourMember'
 *       500:
 *         description: Failed to fetch tour members
 */
router.get(
  "/booking/:id",
  auth,
  acl("tourMembers.read"),
  getAllTourMembersByBookingId
);

/**
 * @swagger
 * /tour-members/{id}:
 *   put:
 *     summary: Update a tour member
 *     tags: [TourMembers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Tour member ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TourMember'
 *     responses:
 *       200:
 *         description: Tour member updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TourMember'
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Tour member not found
 *       500:
 *         description: Failed to update tour member
 */
router.put("/:id", auth, acl("tourMembers.write"), updateTourMember);

module.exports = router;
