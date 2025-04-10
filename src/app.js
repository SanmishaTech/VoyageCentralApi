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
const stateRoutes = require("./routes/state");
const agencyRoutes = require("./routes/agency");
const sectorRoutes = require("./routes/sector");
const subscriptionRoutes = require("./routes/subscription");
const branchRoutes = require("./routes/branch"); // Import branch routes
const { errorHandler } = require("./utils/errorHandler");
const swaggerRouter = require("./swagger");
const config = require("./config/config");
const jwt = require("jsonwebtoken");

const app = express();

app.use(morgan("dev"));
app.use(helmet());

app.use(
  cors({
    origin: config.frontendUrl, // e.g. http://localhost:5173
    credentials: true, // allow cookies if you ever use them
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-refresh-token", // ← add this
    ],
    exposedHeaders: [
      "x-refresh-token", // ← so client JS can read the rotated token
      "x-access-token",
    ],
  })
);

app.use(express.json());

app.use("/auth", authRoutes);

app.use(async (req, res, next) => {
  const refreshToken = req.headers["x-refresh-token"];
  if (!refreshToken) {
    return next();
  }
  // console.log("Refresh token:", refreshToken);

  let payload;
  try {
    // verify against your *refresh* secret
    payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    // console.log("Payload:", payload);
  } catch (err) {
    return next(
      createError(
        401,
        err.name === "TokenExpiredError"
          ? "Refresh token expired"
          : "Invalid refresh token"
      )
    );
  }

  // extract the real userId
  const { userId } = payload;

  // rotate both tokens
  const newRefreshToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
  // send them back in headers
  res.setHeader("x-refresh-token", newRefreshToken);
  res.setHeader("x-access-token", accessToken);
  res.setHeader("Authorization", `Bearer ${accessToken}`);
  req.headers.authorization = `Bearer ${accessToken}`;
  // expose so front‑end JS can read them
  res.setHeader(
    "Access-Control-Expose-Headers",
    "x-refresh-token, x-access-token"
  );

  // make it available to downstream handlers
  req.userId = userId;

  next();
});

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
app.use(swaggerRouter); // Add this line to include Swagger documentation

app.use((req, res, next) => {
  next(createError(404));
});

app.use(errorHandler);

module.exports = app;
