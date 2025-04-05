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
const agencyRoutes = require("./routes/agency");
const { errorHandler } = require("./utils/errorHandler");
const swaggerRouter = require("./swagger");
const config = require("./config/config");

const app = express();

app.use(morgan("dev"));
app.use(helmet());
app.use(
  cors({
    origin: config.frontendUrl, // Allow requests from this origin
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
app.use(swaggerRouter); // Add this line to include Swagger documentation

app.use((req, res, next) => {
  next(createError(404));
});

app.use(errorHandler);

module.exports = app;
