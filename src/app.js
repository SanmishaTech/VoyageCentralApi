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
const staffRoutes = require("./routes/staff");
const stateRoutes = require("./routes/state");
const agencyRoutes = require("./routes/agency");
const sectorRoutes = require("./routes/sector");
const subscriptionRoutes = require("./routes/subscription");
const branchRoutes = require("./routes/branch"); // Import branch routes
const swaggerRouter = require("./swagger");
const config = require("./config/config");

const app = express();

app.use(morgan("dev"));
app.use(helmet());
app.use(
  cors({
    origin: config.frontendUrl || "http://localhost:5173", // Allow requests from this origin
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], // Allowed HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
  })
);
app.use(express.json());

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
app.use(swaggerRouter); // Add this line to include Swagger documentation

app.use((req, res, next) => {
  next(createError(404));
});

module.exports = app;
