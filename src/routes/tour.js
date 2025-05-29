const express = require("express");
const router = express.Router();
const {
  getTours,
  createTour,
  getTourById,
  updateTour,
  deleteTour,
  getAllTours,
  getAllGroupTours,
} = require("../controllers/tourController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");
const createUploadMiddleware = require("../middleware/uploadMiddleware");
const multer = require("multer");
const tourUploadConfig = [
  {
    name: "attachment",
    allowedTypes: ["image/jpeg", "image/png", "image/jpg"],
    maxSize: 2 * 1024 * 1024, // 2MB
  },
];
const uploadMiddleware = createUploadMiddleware("tour", tourUploadConfig);
/**
 * @swagger
 * tags:
 *   name: Tours
 *   description: Tour management endpoints
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
 * /tours:
 *   get:
 *     summary: Get all tours with pagination, sorting, and search
 *     tags: [Tours]
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
 *         description: Number of tours per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for filtering tours
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
 *     responses:
 *       200:
 *         description: List of all tours
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tours:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       tourTitle:
 *                         type: string
 *                       tourType:
 *                         type: string
 *                       destination:
 *                         type: string
 *                       status:
 *                         type: string
 *                       sectorId:
 *                         type: integer
 *                       attachment:
 *                         type: string
 *                       notes:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       500:
 *         description: Failed to fetch tours
 */
router.get("/", auth, acl("tours.read"), getTours);

/**
 * @swagger
 * /tours:
 *   post:
 *     summary: Create a new tour
 *     tags: [Tours]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               tourTitle:
 *                 type: string
 *               tourType:
 *                 type: string
 *               destination:
 *                 type: string
 *               status:
 *                 type: string
 *               sectorId:
 *                 type: integer
 *               attachment:
 *                 type: string
 *                 format: binary
 *               notes:
 *                 type: string
 *               itineraries:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     day:
 *                       type: integer
 *                     description:
 *                       type: string
 *                     cityId:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Tour created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create tour
 */
router.post(
  "/",
  auth,
  acl("tours.write"),
  ...uploadMiddleware, // Spread the array of middleware functions
  createTour
);

/**
 * @swagger
 * /tours/all:
 *   get:
 *     summary: Get all tours without pagination, sorting, and search
 *     tags: [tours]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all tours
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *       500:
 *         description: Failed to fetch tours
 */
router.get("/all", auth, acl("tours.read"), getAllTours);

/**
 * @swagger
 * /tours/allGroupTours:
 *   get:
 *     summary: Get all tours without pagination, sorting, and search
 *     tags: [tours]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all tours
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *       500:
 *         description: Failed to fetch tours
 */
router.get("/allGroupTours", auth, acl("tours.read"), getAllGroupTours);

/**
 * @swagger
 * /tours/{id}:
 *   get:
 *     summary: Get tour by ID
 *     tags: [Tours]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Tour ID
 *     responses:
 *       200:
 *         description: Tour details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 tourTitle:
 *                   type: string
 *                 tourType:
 *                   type: string
 *                 destination:
 *                   type: string
 *                 status:
 *                   type: string
 *                 sectorId:
 *                   type: integer
 *                 attachment:
 *                   type: string
 *                 notes:
 *                   type: string
 *                 itineraries:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       day:
 *                         type: integer
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
 *         description: Tour not found
 *       500:
 *         description: Failed to fetch tour
 */
router.get("/:id", auth, acl("tours.read"), getTourById);

/**
 * @swagger
 * /tours/{id}:
 *   put:
 *     summary: Update an existing tour
 *     tags: [Tours]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Tour ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               tourTitle:
 *                 type: string
 *               tourType:
 *                 type: string
 *               destination:
 *                 type: string
 *               status:
 *                 type: string
 *               sectorId:
 *                 type: integer
 *               attachment:
 *                 type: string
 *                 format: binary
 *               notes:
 *                 type: string
 *               itineraries:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     day:
 *                       type: integer
 *                     description:
 *                       type: string
 *                     cityId:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Tour updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Tour not found
 *       500:
 *         description: Failed to update tour
 */
router.put(
  "/:id",
  auth,
  acl("tours.write"),
  ...uploadMiddleware, // Spread the array of middleware functions
  updateTour
);

/**
 * @swagger
 * /tours/{id}:
 *   delete:
 *     summary: Delete tour by ID
 *     tags: [Tours]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Tour ID
 *     responses:
 *       204:
 *         description: Tour deleted successfully
 *       404:
 *         description: Tour not found
 *       500:
 *         description: Failed to delete tour
 */
router.delete("/:id", auth, acl("tours.delete"), deleteTour);

module.exports = router;
