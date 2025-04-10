const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { z } = require("zod");
const prisma = require("../config/db");
const emailService = require("../services/emailService");
const validateRequest = require("../utils/validateRequest");
const config = require("../config/config");
const jwtConfig = require("../config/jwt");

// Register a new user
const register = async (req, res, next) => {
  if (process.env.ALLOW_REGISTRATION !== "true") {
    return res
      .status(403)
      .json({ errors: { message: "Registration is disabled" } });
  }

  // Define Zod schema for registration validation
  const schema = z
    .object({
      name: z.string().nonempty("Name is required."),
      email: z
        .string()
        .email("Email must be a valid email address.")
        .nonempty("Email is required."),
      password: z
        .string()
        .min(6, "Password must be at least 6 characters long.")
        .nonempty("Password is required."),
    })
    .superRefine(async (data, ctx) => {
      // Check if a user with the same email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        ctx.addIssue({
          path: ["email"],
          message: `User with email ${data.email} already exists.`,
        });
      }
    });

  try {
    // Use the reusable validation function
    const validationErrors = await validateRequest(schema, req.body, res);
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: config.defaultUserRole,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

// const login = async (req, res, next) => {
//   const schema = z.object({
//     email: z.string().email("Invalid Email format").min(1, "email is required"),
//     password: z.string().min(6, "Password must be at least 6 characters long"),
//   });

//   try {
//     const validationErrors = await validateRequest(schema, req.body, res);

//     const { email, password } = req.body;
//     const user = await prisma.user.findUnique({ where: { email } });

//     if (!user || !(await bcrypt.compare(password, user.password))) {
//       return res
//         .status(401)
//         .json({ errors: { message: "Invalid email or password" } });
//     }

//     if (!user.active) {
//       return res
//         .status(403)
//         .json({ errors: { message: "Account is inactive" } });
//     }

//     // Check if the user is a super_admin
//     if (user.role === "super_admin") {
//       // Update lastLogin timestamp
//       await prisma.user.update({
//         where: { id: user.id },
//         data: { lastLogin: new Date() },
//       });

//       const token = jwt.sign({ userId: user.id }, jwtConfig.secret, {
//         // expiresIn: jwtConfig.expiresIn,
//         expiresIn: "30s",
//       });

//       return res.json({
//         token,
//         user: {
//           id: user.id,
//           name: user.name,
//           email: user.email,
//           role: user.role,
//           lastLogin: user.lastLogin,
//         },
//       });
//     }

//     // If the user is not a super_admin, check their agency
//     const agency = await prisma.agency.findFirst({
//       where: {
//         users: {
//           some: { id: user.id }, // Check if the user belongs to an agency
//         },
//       },
//       include: {
//         currentSubscription: true, // Include the current subscription details
//       },
//     });

//     if (!agency) {
//       return res
//         .status(500)
//         .json({ errors: { message: "User does not belong to any agency" } });
//     }

//     // Check the subscription details
//     const currentSubscription = agency.currentSubscription;
//     if (
//       !currentSubscription ||
//       new Date(currentSubscription.endDate) < new Date()
//     ) {
//       return res
//         .status(403)
//         .json({ errors: { message: "Subscription expired" } });
//     }

//     // Update lastLogin timestamp
//     await prisma.user.update({
//       where: { id: user.id },
//       data: { lastLogin: new Date() },
//     });

//     const token = jwt.sign({ userId: user.id }, jwtConfig.secret, {
//       // expiresIn: jwtConfig.expiresIn,
//       expiresIn: "30",
//     });

//     res.json({
//       token,
//       user: {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//         lastLogin: user.lastLogin,
//         agency: {
//           id: agency.id,
//           name: agency.businessName,
//         },
//         subscription: {
//           id: currentSubscription.id,
//           startDate: currentSubscription.startDate,
//           endDate: currentSubscription.endDate,
//         },
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };
const login = async (req, res, next) => {
  const schema = z.object({
    email: z.string().email().optional(),
    password: z.string().optional(),
  });

  try {
    // validateRequest(schema, req);

    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res
        .status(401)
        .json({ errors: { message: "Invalid email or password" } });
    }

    if (!user.active) {
      return res
        .status(403)
        .json({ errors: { message: "Account is inactive" } });
    }

    // Update lastLogin timestamp using primary key (id)
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = jwt.sign({ userId: user.id }, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn,
    });
    const accesstoken = jwt.sign({ userId: user.id }, jwtConfig.secret, {
      expiresIn: "5h",
    });
    res.cookie("refreshToken", accesstoken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    res.setHeader("x-access-token", accesstoken);

    res.json({
      token,
      accesstoken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    next(error);
  }
};
const forgotPassword = async (req, res, next) => {
  const schema = z.object({
    email: z
      .string()
      .email("Invalid Email format")
      .nonempty("Email is required"),
  });

  try {
    const validationErrors = await validateRequest(schema, req.body, res);
    const { email, resetUrl } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return setTimeout(() => {
        res.status(404).json({ errors: { message: "User not found" } });
      }, 3000);
    }

    const resetToken = uuidv4();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpires: new Date(Date.now() + 3600000), // Token expires in 1 hour
      },
    });
    const resetLink = `${resetUrl}/${resetToken}`; // Replace with your actual domain
    const templateData = {
      name: user.name,
      resetLink,
      appName: config.appName,
    };
    await emailService.sendEmail(
      email,
      "Password Reset Request",
      "passwordReset",
      templateData
    );

    res.json({ message: "Password reset link sent" });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  const schema = z.object({
    password: z.string().min(6, "Password must be at least 6 characters long"),
  });

  try {
    // Use the reusable validation function
    const validationErrors = await validateRequest(schema, req.body, res);
    const { password } = req.body;
    const { token } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: { gt: new Date() }, // Check if the token is not expired
      },
    });

    if (!user) {
      return res
        .status(400)
        .json({ errors: { message: "Invalid or expired token" } });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null, // Clear the token after use
        resetTokenExpires: null,
      },
    });
    res.json({ message: "Password reset successful" });
  } catch (error) {
    next(error);
  }
};
module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
};
