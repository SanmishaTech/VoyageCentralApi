const express = require("express");
const router = express.Router();
const { getUpcomingFollowUps } = require("../controllers/dashboardController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard endpoints
 */

/**
 * @swagger
 * /dashboard/follow-ups:
 *   get:
 *     summary: Get upcoming follow-ups for the next 7 days (paginated)
 *     tags: [Dashboard]
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
 *         description: Number of follow-ups per page
 *     responses:
 *       200:
 *         description: List of upcoming follow-ups
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
 *                       bookingNumber:
 *                         type: string
 *                       nextFollowUpDate:
 *                         type: string
 *                         format: date
 *                       remarks:
 *                         type: string
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalFollowUps:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *       500:
 *         description: Failed to fetch upcoming follow-ups
 */
router.get("/follow-ups", auth, acl("dashboard.read"), getUpcomingFollowUps);

module.exports = router;
