const express = require("express");
const router = express.Router();
const {
  createBranch,
  getBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
} = require("../controllers/branchController");
const auth = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Branches
 *   description: Branch management endpoints
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
 * /branches:
 *   post:
 *     summary: Create a new branch
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               agencyId:
 *                 type: integer
 *                 description: ID of the agency associated with the branch
 *               branchName:
 *                 type: string
 *                 description: Name of the branch
 *               address:
 *                 type: string
 *                 description: Address of the branch
 *               contactName:
 *                 type: string
 *                 description: Contact name of the branch
 *               contactEmail:
 *                 type: string
 *                 description: Contact email of the branch
 *               contactMobile:
 *                 type: string
 *                 description: Contact mobile of the branch
 *     responses:
 *       201:
 *         description: Branch created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post("/", auth, createBranch);

/**
 * @swagger
 * /branches:
 *   get:
 *     summary: Get all branches
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all branches
 *       500:
 *         description: Internal server error
 */
router.get("/", auth, getBranches);

/**
 * @swagger
 * /branches/{id}:
 *   get:
 *     summary: Get a branch by ID
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the branch to retrieve
 *     responses:
 *       200:
 *         description: Branch retrieved successfully
 *       404:
 *         description: Branch not found
 *       500:
 *         description: Internal server error
 */
router.get("/:id", auth, getBranchById);

/**
 * @swagger
 * /branches/{id}:
 *   put:
 *     summary: Update a branch by ID
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the branch to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               agencyId:
 *                 type: integer
 *                 description: ID of the agency associated with the branch
 *               branchName:
 *                 type: string
 *                 description: Name of the branch
 *               address:
 *                 type: string
 *                 description: Address of the branch
 *               contactName:
 *                 type: string
 *                 description: Contact name of the branch
 *               contactEmail:
 *                 type: string
 *                 description: Contact email of the branch
 *               contactMobile:
 *                 type: string
 *                 description: Contact mobile of the branch
 *     responses:
 *       200:
 *         description: Branch updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Branch not found
 *       500:
 *         description: Internal server error
 */
router.put("/:id", auth, updateBranch);

/**
 * @swagger
 * /branches/{id}:
 *   delete:
 *     summary: Delete a branch by ID
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the branch to delete
 *     responses:
 *       204:
 *         description: Branch deleted successfully
 *       404:
 *         description: Branch not found
 *       500:
 *         description: Internal server error
 */
router.delete("/:id", auth, deleteBranch);

module.exports = router;
