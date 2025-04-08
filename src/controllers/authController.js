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
    const validatedData = await validateRequest(schema, req.body, res);

    const { name, email, password } = validatedData;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

// Login a user
const login = async (req, res, next) => {
  // Define Zod schema for login validation
  const schema = z.object({
    email: z
      .string()
      .email("Email must be a valid email address.")
      .nonempty("Email is required."),
    password: z.string().nonempty("Password is required."),
  });

  try {
    // Use the reusable validation function
    const validatedData = await validateRequest(schema, req.body, res);

    const { email, password } = validatedData;
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

    const token = jwt.sign({ userId: user.id }, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn,
    });

    res.json({ token, user });
  } catch (error) {
    next(error);
  }
};

// Forgot password
const forgotPassword = async (req, res, next) => {
  // Define Zod schema for forgot password validation
  const schema = z.object({
    email: z
      .string()
      .email("Email must be a valid email address.")
      .nonempty("Email is required."),
  });

  try {
    // Use the reusable validation function
    const validatedData = await validateRequest(schema, req.body, res);

    const { email } = validatedData;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res
        .status(404)
        .json({ errors: { message: "User with this email does not exist." } });
    }

    const resetToken = uuidv4();
    await prisma.user.update({
      where: { email },
      data: { resetToken },
    });

    await emailService.sendPasswordResetEmail(email, resetToken);

    res.status(200).json({ message: "Password reset email sent." });
  } catch (error) {
    next(error);
  }
};

// Reset password
const resetPassword = async (req, res, next) => {
  // Define Zod schema for reset password validation
  const schema = z.object({
    resetToken: z.string().nonempty("Reset token is required."),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters long.")
      .nonempty("New password is required."),
  });

  try {
    // Use the reusable validation function
    const validatedData = await validateRequest(schema, req.body, res);

    const { resetToken, newPassword } = validatedData;
    const user = await prisma.user.findUnique({ where: { resetToken } });

    if (!user) {
      return res
        .status(404)
        .json({ errors: { message: "Invalid or expired reset token." } });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { resetToken },
      data: { password: hashedPassword, resetToken: null },
    });

    res.status(200).json({ message: "Password reset successfully." });
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
