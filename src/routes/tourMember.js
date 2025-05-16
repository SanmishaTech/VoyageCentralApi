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
 * /tour-members/{id}:
 *   post:
 *     summary: Create a new tour member for a booking
 *     tags: [TourMembers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Booking ID to which the tour member belongs
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - name
 *             properties:
 *               title:
 *                 type: string
 *               name:
 *                 type: string
 *               gender:
 *                 type: string
 *               relation:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date-time
 *               anniversaryDate:
 *                 type: string
 *                 format: date-time
 *               foodType:
 *                 type: string
 *               mobile:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tour member created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TourMember'
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Failed to create tour member
 */
router.post("/:id", auth, acl("tourMembers.write"), createTourMember);

/**
 * @swagger
 * /tour-members/{id}:
 *   get:
 *     summary: Get a tour member by ID
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
 *     responses:
 *       200:
 *         description: Tour member details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TourMember'
 *       404:
 *         description: Tour member not found
 *       500:
 *         description: Failed to fetch tour member
 */
router.get("/:id", auth, acl("tourMembers.read"), getTourMemberById);

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
/**
 * @swagger
 * /tour-members/{id}:
 *   delete:
 *     summary: Delete a tour member by ID
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
 *     responses:
 *       204:
 *         description: Tour member deleted successfully
 *       404:
 *         description: Tour member not found
 *       500:
 *         description: Failed to delete tour member
 */
router.delete("/:id", auth, acl("tourMembers.delete"), deleteTourMember);

module.exports = router;
