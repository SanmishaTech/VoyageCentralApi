/**
 * Simplified line costing (no GST on line amounts / service charges).
 * totalCost = cost + serviceCharge
 * commission is tracked only (agent money); not part of totalCost.
 */

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Hotel / Vehicle / Service / Journey line costing.
 */
const calculateStandardLineCosting = ({
  cost,
  serviceCharge,
  inputCommission,
}) => {
  const baseCost = toNumber(cost);
  const sc = toNumber(serviceCharge);
  const totalCost = round2(baseCost + sc);

  return {
    inputGstPercentage: 0,
    inputGstAmount: 0,
    inputCost: baseCost, // equals cost when no line GST
    serviceCharge: sc,
    serviceChargeGst: 0,
    serviceChargeGstAmount: 0,
    totalServiceCharge: sc,
    totalCost,
    inputCommission: toNumber(inputCommission),
  };
};

/** Journey uses the same simplified formula now. */
const calculateJourneyLineCosting = calculateStandardLineCosting;

const hotelInputCost = (row) => {
  if (row.inputCost != null && row.inputCost !== "") return toNumber(row.inputCost);
  if (row.totalAmount != null && row.totalAmount !== "") return toNumber(row.totalAmount);
  return toNumber(row.amount);
};

const hotelServiceCharge = (row) => toNumber(row.serviceCharge);

const vehicleInputCost = (row) => {
  if (row.inputCost != null && row.inputCost !== "") return toNumber(row.inputCost);
  return toNumber(row.amount);
};

const vehicleServiceCharge = (row) => toNumber(row.serviceCharge);

const serviceInputCost = (row) => {
  if (row.inputCost != null && row.inputCost !== "") return toNumber(row.inputCost);
  return toNumber(row.cost);
};

const serviceServiceCharge = (row) => toNumber(row.serviceCharge);

const journeyInputCost = (row) => {
  if (row.inputCost != null && row.inputCost !== "") return toNumber(row.inputCost);
  return toNumber(row.amount);
};

const journeyTotalCost = (row) => {
  if (row.totalCost != null && row.totalCost !== "") return toNumber(row.totalCost);
  return round2(journeyInputCost(row) + toNumber(row.serviceCharge));
};

const journeyTotalServiceCharge = (row) => toNumber(row.serviceCharge);

module.exports = {
  toNumber,
  round2,
  calculateStandardLineCosting,
  calculateJourneyLineCosting,
  hotelInputCost,
  hotelServiceCharge,
  vehicleInputCost,
  vehicleServiceCharge,
  serviceInputCost,
  serviceServiceCharge,
  journeyInputCost,
  journeyTotalCost,
  journeyTotalServiceCharge,
};
