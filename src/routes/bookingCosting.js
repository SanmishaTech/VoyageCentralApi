const express = require("express");
const router = express.Router();
const {
  getBookingCosting,
  upsertBookingCosting,
  downloadTaxInvoice,
  downloadQuotation,
  downloadPackageSummary,
} = require("../controllers/bookingCostingController");
const {
  getEnquiryCosting,
  upsertEnquiryCosting,
  downloadEstimate,
} = require("../controllers/enquiryCostingController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

// More specific routes first
router.get(
  "/:bookingId/tax-invoice",
  auth,
  acl("bookings.read"),
  downloadTaxInvoice
);
router.get(
  "/:bookingId/quotation",
  auth,
  acl("bookings.read"),
  downloadQuotation
);
router.get(
  "/:bookingId/package-summary",
  auth,
  acl("bookings.read"),
  downloadPackageSummary
);
router.get(
  "/:bookingId/enquiry-costing",
  auth,
  acl("bookings.read"),
  getEnquiryCosting
);
router.put(
  "/:bookingId/enquiry-costing",
  auth,
  acl("bookings.write"),
  upsertEnquiryCosting
);
router.get(
  "/:bookingId/estimate",
  auth,
  acl("bookings.read"),
  downloadEstimate
);

router.get("/:bookingId", auth, acl("bookings.read"), getBookingCosting);
router.put("/:bookingId", auth, acl("bookings.write"), upsertBookingCosting);

module.exports = router;
