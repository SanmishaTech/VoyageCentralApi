const express = require("express");
const router = express.Router();
const { createSubscription } = require("../controllers/subscriptionController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Subscription management endpoints
 */

/**
 * @swagger
 * /subscriptions:
 *   post:
 *     summary: Create a new subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               packageId:
 *                 type: integer
 *                 description: ID of the package associated with the subscription
 *               agencyId:
 *                 type: integer
 *                 description: ID of the agency associated with the subscription
 *     responses:
 *       201:
 *         description: Subscription created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 packageId:
 *                   type: integer
 *                 agencyId:
 *                   type: integer
 *                 startDate:
 *                   type: string
 *                   format: date
 *                 endDate:
 *                   type: string
 *                   format: date
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *       500:
 *         description: Failed to create subscription
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 */
router.post("/", auth, acl("subscriptions.write"), createSubscription);

module.exports = router;