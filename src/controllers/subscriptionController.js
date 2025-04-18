const { PrismaClient } = require("@prisma/client");
const createError = require("http-errors");
const prisma = new PrismaClient();
const { z } = require("zod"); // Import Zod for validation
const validateRequest = require("../utils/validateRequest"); // Utility function for validation
const dayjs = require("dayjs"); // Import dayjs

const createSubscription = async (req, res, next) => {
  // Define Zod schema for subscription validation
  const schema = z
    .object({
      packageId: z
        .number({
          required_error: "Package ID is required.",
          invalid_type_error: "Package ID must be a number.",
        })
        .int("Package ID must be an integer."),
      agencyId: z
        .number({
          required_error: "Agency ID is required.",
          invalid_type_error: "Agency ID must be a number.",
        })
        .int("Agency ID must be an integer."),
    })
    .superRefine(async (data, ctx) => {
      // Check if the package exists
      const packageData = await prisma.package.findUnique({
        where: { id: parseInt(data.packageId) },
      });

      if (!packageData) {
        ctx.addIssue({
          path: ["packageId"],
          message: "Package does not exist with the provided packageId.",
        });
      }

      // Check if the agency exists
      const agencyData = await prisma.agency.findUnique({
        where: { id: parseInt(data.agencyId) },
        include: { currentSubscription: true },
      });

      if (!agencyData) {
        ctx.addIssue({
          path: ["agencyId"],
          message: "Agency does not exist with the provided agencyId.",
        });
      }
    });

  // Validate the request body using Zod
  const validationErrors = await validateRequest(schema, req.body, res);
  const { packageId, agencyId } = req.body;

  try {
    // Get agency data to retrieve currentSubscriptionId
    const agencyData = await prisma.agency.findUnique({
      where: { id: agencyId },
      include: { currentSubscription: true }, // Include current subscription details
    });

    // Determine the startDate for the new subscription
    let startDate;
    if (agencyData.currentSubscription) {
      // Use the endDate of the current subscription as the startDate for the new subscription
      // startDate = dayjs(agencyData.currentSubscription.endDate);
      startDate = dayjs(agencyData.currentSubscription.endDate).add(1, 'day');
    } else {
      // If no current subscription, send an error
      return res.status(400).json({
        errors: {
          message:
            "No current subscription exists for the provided agency. Cannot create a new subscription.",
        },
      });
    }

    // Calculate the endDate for the new subscription
    const packageData = await prisma.package.findUnique({
      where: { id: packageId },
    });
    const endDate = startDate.add(packageData.periodInMonths, "month");

    // Create the new subscription
    const newSubscription = await prisma.subscription.create({
      data: {
        packageId,
        agencyId,
        startDate: startDate.toDate(), // Convert dayjs object to JavaScript Date
        endDate: endDate.toDate(), // Convert dayjs object to JavaScript Date
        cost: packageData.cost,
      },
    });

    // Update the agency's currentSubscriptionId with the new subscription ID
    await prisma.agency.update({
      where: { id: agencyId },
      data: { currentSubscriptionId: newSubscription.id },
    });

    res.status(201).json(newSubscription);
  } catch (error) {
    next(error); // Pass the error to the centralized error handler
  }
};

module.exports = {
  createSubscription,
};
