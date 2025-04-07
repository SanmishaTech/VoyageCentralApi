const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const Joi = require("joi"); // Import Joi for validation
const validateRequest = require("../utils/validation"); // Utility function for validation
const dayjs = require("dayjs"); // Import dayjs

const createSubscription = async (req, res, next) => {
  // Define Joi schema for subscription validation
  const schema = Joi.object({
    packageId: Joi.number().integer().required().messages({
      "number.base": "Package ID must be a number.",
      "any.required": "Package ID is required.",
    }),
    agencyId: Joi.number().integer().required().messages({
      "number.base": "Agency ID must be a number.",
      "any.required": "Agency ID is required.",
    }),
  });

  // Validate request body using the utility function
  const validationErrors = await validateRequest(schema, req);
  if (validationErrors) {
    return res.status(400).json({ errors: validationErrors });
  }

  const { packageId, agencyId } = req.body;

  try {
    // Get package data to retrieve periodInMonths
    const packageData = await prisma.package.findUnique({
      where: { id: packageId },
    });

    if (!packageData) {
      return res.status(400).json({
        errors: {
          message: "Package does not exist with the provided packageId.",
        },
      });
    }

    // Get agency data to retrieve currentSubscriptionId
    const agencyData = await prisma.agency.findUnique({
      where: { id: agencyId },
      include: { currentSubscription: true }, // Include current subscription details
    });

    if (!agencyData) {
      return res.status(400).json({
        errors: {
          message: "Agency does not exist with the provided agencyId.",
        },
      });
    }

    // Determine the startDate for the new subscription
    let startDate;
    if (agencyData.currentSubscription) {
      // Use the endDate of the current subscription as the startDate for the new subscription
      startDate = dayjs(agencyData.currentSubscription.endDate);
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
    const endDate = startDate.add(packageData.periodInMonths, "month");

    // Create the new subscription
    const newSubscription = await prisma.subscription.create({
      data: {
        packageId,
        agencyId,
        startDate: startDate.toDate(), // Convert dayjs object to JavaScript Date
        endDate: endDate.toDate(), // Convert dayjs object to JavaScript Date
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
