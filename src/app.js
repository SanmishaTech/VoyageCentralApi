const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const createError = require("http-errors");
require("dotenv").config();
const roleRoutes = require("./routes/roles");
const userRoutes = require("./routes/users");
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const packageRoutes = require("./routes/package");
const countryRoutes = require("./routes/country");
const cityRoutes = require("./routes/city");
const accommodationRoutes = require("./routes/accommodation");
const vehicleRoutes = require("./routes/vehicle");
const airlineRoutes = require("./routes/airline");
const bankRoutes = require("./routes/bank");
const hotelRoutes = require("./routes/hotel");
const serviceRoutes = require("./routes/service");
const clientRoutes = require("./routes/client");
const staffRoutes = require("./routes/staff");
const stateRoutes = require("./routes/state");
const agencyRoutes = require("./routes/agency");
const tourRoutes = require("./routes/tour");
const bookingRoutes = require("./routes/booking");
const journeyBookingRoutes = require("./routes/journeyBooking");
const hotelBookingRoutes = require("./routes/hotelBooking");
const tourMemberRoutes = require("./routes/tourMember");
const travelDocumentRoutes = require("./routes/travelDocument");
const serviceBookingRoutes = require("./routes/serviceBooking");
const vehicleBookingRoutes = require("./routes/vehicleBooking");
const followUpRoutes = require("./routes/followUp");
const sectorRoutes = require("./routes/sector");
const agentRoutes = require("./routes/agent");
const bookingReceiptRoutes = require("./routes/bookingReceipt");
const subscriptionRoutes = require("./routes/subscription");
const branchRoutes = require("./routes/branch"); // Import branch routes
const dashboardRoutes = require("./routes/dashboard");
// booking routes
const groupBookingRoutes = require("./routes/groupBooking");
const groupClientBookingRoutes = require("./routes/groupClientBooking");
const groupClientJourneyBookingRoutes = require("./routes/groupClientJourneyBooking");
const groupClientBookingReceiptRoutes = require("./routes/groupClientBookingReceipt");
const groupClientTravelDocumentRoutes = require("./routes/groupClientTravelDocument");

// booking routes end
const swaggerRouter = require("./swagger");
const path = require("path");
const config = require("./config/config");
const app = express();
app.use(morgan("dev"));
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resource loading
  })
);
app.use(
  cors({
    origin: config.frontendUrl || "http://localhost:5173", // Allow requests from this origin
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], // Allowed HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For application/x-www-form-urlencoded (optional, but common)
const uploadsPath = path.join(__dirname, "..", "uploads");
console.log(`Serving static files from: ${uploadsPath}`); // Verify this path on startup!
app.use("/uploads", express.static(uploadsPath));
app.use("/auth", authRoutes);
app.use("/roles", roleRoutes);
app.use("/users", userRoutes);
app.use("/profile", profileRoutes);
app.use("/packages", packageRoutes);
app.use("/agencies", agencyRoutes);
app.use("/subscriptions", subscriptionRoutes);
app.use("/branches", branchRoutes); // Use branch routes
app.use("/countries", countryRoutes);
app.use("/sectors", sectorRoutes);
app.use("/states", stateRoutes);
app.use("/cities", cityRoutes);
app.use("/staff", staffRoutes);
app.use("/accommodations", accommodationRoutes);
app.use("/vehicles", vehicleRoutes);
app.use("/airlines", airlineRoutes);
app.use("/hotels", hotelRoutes);
app.use("/clients", clientRoutes);
app.use("/banks", bankRoutes);
app.use("/services", serviceRoutes);
app.use("/tours", tourRoutes);
app.use("/agents", agentRoutes);
app.use("/bookings", bookingRoutes);
app.use("/follow-ups", followUpRoutes);
app.use("/journey-bookings", journeyBookingRoutes);
app.use("/hotel-bookings", hotelBookingRoutes);
app.use("/service-bookings", serviceBookingRoutes);
app.use("/vehicle-bookings", vehicleBookingRoutes);
app.use("/tour-members", tourMemberRoutes);
app.use("/travel-documents", travelDocumentRoutes);
app.use("/booking-receipts", bookingReceiptRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/group-bookings", groupBookingRoutes);
app.use("/group-client-bookings", groupClientBookingRoutes);
app.use("/group-client-journey-bookings", groupClientJourneyBookingRoutes);
app.use("/group-client-booking-receipts", groupClientBookingReceiptRoutes);
app.use("/group-client-travel-documents", groupClientTravelDocumentRoutes);

app.use(swaggerRouter); // Add this line to include Swagger documentation

app.use((req, res, next) => {
  next(createError(404));
});

module.exports = app;
