const express = require("express");
const router = express.Router();
const {
  getHotels,
  createHotel,
  getHotelById,
  updateHotel,
  deleteHotel,
  getAllHotels,
} = require("../controllers/hotelController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: Hotels
 *   description: Hotel management endpoints
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
 * /hotels:
 *   get:
 *     summary: Get all hotels with pagination, sorting, and search
 *     tags: [Hotels]
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
 *         description: Number of hotels per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for hotel name or other fields
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
 *         description: List of all hotels
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hotels:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       hotelName:
 *                         type: string
 *                       hotelAddressLine1:
 *                         type: string
 *                       hotelAddressLine2:
 *                         type: string
 *                       hotelAddressLine3:
 *                         type: string
 *                       hotelCountry:
 *                         type: string
 *                       hotelState:
 *                         type: string
 *                       hotelCity:
 *                         type: string
 *                       hotelPincode:
 *                         type: string
 *                       officeAddressLine1:
 *                         type: string
 *                       officeAddressLine2:
 *                         type: string
 *                       officeAddressLine3:
 *                         type: string
 *                       officeCountry:
 *                         type: string
 *                       officeState:
 *                         type: string
 *                       officeCity:
 *                         type: string
 *                       officePincode:
 *                         type: string
 *                       contactPerson:
 *                         type: string
 *                       hotelContactNo1:
 *                         type: string
 *                       hotelContactNo2:
 *                         type: string
 *                       officeContactNo1:
 *                         type: string
 *                       officeContactNo2:
 *                         type: string
 *                       email1:
 *                         type: string
 *                       email2:
 *                         type: string
 *                       website:
 *                         type: string
 *                       panNumber:
 *                         type: string
 *                       bankName:
 *                         type: string
 *                       bankAccountNumber:
 *                         type: string
 *                       branch:
 *                         type: string
 *                       beneficiaryName:
 *                         type: string
 *                       ifsc_code:
 *                         type: string
 *                       swiftCode:
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
 *                 totalHotels:
 *                   type: integer
 *       500:
 *         description: Failed to fetch hotels
 */
router.get("/", auth, acl("hotels.read"), getHotels);

/**
 * @swagger
 * /hotels:
 *   post:
 *     summary: Create a new hotel
 *     tags: [Hotels]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hotelName:
 *                 type: string
 *               hotelAddressLine1:
 *                 type: string
 *               hotelAddressLine2:
 *                 type: string
 *               hotelAddressLine3:
 *                 type: string
 *               hotelCountry:
 *                 type: string
 *               hotelState:
 *                 type: string
 *               hotelCity:
 *                 type: string
 *               hotelPincode:
 *                 type: string
 *               officeAddressLine1:
 *                 type: string
 *               officeAddressLine2:
 *                 type: string
 *               officeAddressLine3:
 *                 type: string
 *               officeCountry:
 *                 type: string
 *               officeState:
 *                 type: string
 *               officeCity:
 *                 type: string
 *               officePincode:
 *                 type: string
 *               contactPerson:
 *                 type: string
 *               hotelContactNo1:
 *                 type: string
 *               hotelContactNo2:
 *                 type: string
 *               officeContactNo1:
 *                 type: string
 *               officeContactNo2:
 *                 type: string
 *               email1:
 *                 type: string
 *               email2:
 *                 type: string
 *               website:
 *                 type: string
 *               panNumber:
 *                 type: string
 *               bankName:
 *                 type: string
 *               bankAccountNumber:
 *                 type: string
 *               branch:
 *                 type: string
 *               beneficiaryName:
 *                 type: string
 *               ifsc_code:
 *                 type: string
 *               swiftCode:
 *                 type: string
 *     responses:
 *       201:
 *         description: Hotel created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create hotel
 */
router.post("/", auth, acl("hotels.write"), createHotel);

/**
 * @swagger
 * /hotels/all:
 *   get:
 *     summary: Get all hotels without pagination, sorting, and search
 *     tags: [Hotels]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all hotels
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   hotelName:
 *                     type: string
 *                   hotelCity:
 *                     type: string
 *       500:
 *         description: Failed to fetch hotels
 */
router.get("/all", auth, acl("hotels.read"), getAllHotels);

/**
 * @swagger
 * /hotels/{id}:
 *   get:
 *     summary: Get hotel by ID
 *     tags: [Hotels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Hotel ID
 *     responses:
 *       200:
 *         description: Hotel details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 hotelName:
 *                   type: string
 *                 hotelAddressLine1:
 *                   type: string
 *                 hotelAddressLine2:
 *                   type: string
 *                 hotelAddressLine3:
 *                   type: string
 *                 hotelCountry:
 *                   type: string
 *                 hotelState:
 *                   type: string
 *                 hotelCity:
 *                   type: string
 *                 hotelPincode:
 *                   type: string
 *                 officeAddressLine1:
 *                   type: string
 *                 officeAddressLine2:
 *                   type: string
 *                 officeAddressLine3:
 *                   type: string
 *                 officeCountry:
 *                   type: string
 *                 officeState:
 *                   type: string
 *                 officeCity:
 *                   type: string
 *                 officePincode:
 *                   type: string
 *                 contactPerson:
 *                   type: string
 *                 hotelContactNo1:
 *                   type: string
 *                 hotelContactNo2:
 *                   type: string
 *                 officeContactNo1:
 *                   type: string
 *                 officeContactNo2:
 *                   type: string
 *                 email1:
 *                   type: string
 *                 email2:
 *                   type: string
 *                 website:
 *                   type: string
 *                 panNumber:
 *                   type: string
 *                 bankName:
 *                   type: string
 *                 bankAccountNumber:
 *                   type: string
 *                 branch:
 *                   type: string
 *                 beneficiaryName:
 *                   type: string
 *                 ifsc_code:
 *                   type: string
 *                 swiftCode:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Hotel not found
 *       500:
 *         description: Failed to fetch hotel
 */
router.get("/:id", auth, acl("hotels.read"), getHotelById);

/**
 * @swagger
 * /hotels/{id}:
 *   put:
 *     summary: Update hotel by ID
 *     tags: [Hotels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Hotel ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hotelName:
 *                 type: string
 *               hotelAddressLine1:
 *                 type: string
 *               hotelAddressLine2:
 *                 type: string
 *               hotelAddressLine3:
 *                 type: string
 *               hotelCountry:
 *                 type: string
 *               hotelState:
 *                 type: string
 *               hotelCity:
 *                 type: string
 *               hotelPincode:
 *                 type: string
 *               officeAddressLine1:
 *                 type: string
 *               officeAddressLine2:
 *                 type: string
 *               officeAddressLine3:
 *                 type: string
 *               officeCountry:
 *                 type: string
 *               officeState:
 *                 type: string
 *               officeCity:
 *                 type: string
 *               officePincode:
 *                 type: string
 *               contactPerson:
 *                 type: string
 *               hotelContactNo1:
 *                 type: string
 *               hotelContactNo2:
 *                 type: string
 *               officeContactNo1:
 *                 type: string
 *               officeContactNo2:
 *                 type: string
 *               email1:
 *                 type: string
 *               email2:
 *                 type: string
 *               website:
 *                 type: string
 *               panNumber:
 *                 type: string
 *               bankName:
 *                 type: string
 *               bankAccountNumber:
 *                 type: string
 *               branch:
 *                 type: string
 *               beneficiaryName:
 *                 type: string
 *               ifsc_code:
 *                 type: string
 *               swiftCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Hotel updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Hotel not found
 *       500:
 *         description: Failed to update hotel
 */
router.put("/:id", auth, acl("hotels.write"), updateHotel);

/**
 * @swagger
 * /hotels/{id}:
 *   delete:
 *     summary: Delete hotel by ID
 *     tags: [Hotels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Hotel ID
 *     responses:
 *       204:
 *         description: Hotel deleted successfully
 *       404:
 *         description: Hotel not found
 *       500:
 *         description: Failed to delete hotel
 */
router.delete("/:id", auth, acl("hotels.delete"), deleteHotel);

module.exports = router;
