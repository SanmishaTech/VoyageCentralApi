const express = require("express");
const router = express.Router();
const {
  createSubscription,
  generateSubscriptionInvoicePdf,
} = require("../controllers/subscriptionController");
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
 * /invoice/{id}:
 *   get:
 *     summary: Generate and download a subscription invoice PDF
 *     description: Generates a PDF invoice for the specified subscription ID. Requires authentication and `subscriptions.read` permission.
 *     tags:
 *       - Subscriptions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the subscription
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: PDF invoice successfully generated
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized – user is not authenticated
 *       403:
 *         description: Forbidden – user lacks required permissions
 *       404:
 *         description: Subscription not found
 *       500:
 *         description: Server error while generating invoice
 */

router.get(
  "/invoice/:id",
  auth,
  acl("subscriptions.read"),
  generateSubscriptionInvoicePdf
);
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
