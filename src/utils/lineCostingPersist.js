const { Prisma } = require("@prisma/client");
const {
  calculateStandardLineCosting,
  calculateJourneyLineCosting,
} = require("./lineCostingMath");

const toDecimal = (value) => {
  if (value === null || value === undefined || value === "") return null;
  return new Prisma.Decimal(value);
};

/**
 * Persist simplified line costing (amount + service charge + commission).
 * GST fields are zeroed for compatibility with existing columns.
 */
const buildStandardLineCostData = (body, costValue) => {
  const calc = calculateStandardLineCosting({
    cost: costValue,
    serviceCharge: body.serviceCharge,
    inputCommission: 0,
  });
  return {
    inputGstPercentage: toDecimal(0),
    inputGstAmount: toDecimal(0),
    inputCost: toDecimal(calc.inputCost),
    serviceCharge: toDecimal(calc.serviceCharge),
    totalCost: toDecimal(calc.totalCost),
    inputCommission: toDecimal(0),
  };
};

const buildJourneyLineCostData = (body, costValue) => {
  const calc = calculateJourneyLineCosting({
    cost: costValue,
    serviceCharge: body.serviceCharge,
    inputCommission: 0,
  });
  return {
    inputGstPercentage: toDecimal(0),
    inputGstAmount: toDecimal(0),
    inputCost: toDecimal(calc.inputCost),
    serviceCharge: toDecimal(calc.serviceCharge),
    serviceChargeGst: toDecimal(0),
    serviceChargeGstAmount: toDecimal(0),
    totalServiceCharge: toDecimal(calc.totalServiceCharge),
    totalCost: toDecimal(calc.totalCost),
    inputCommission: toDecimal(0),
  };
};

module.exports = {
  toDecimal,
  buildStandardLineCostData,
  buildJourneyLineCostData,
};
