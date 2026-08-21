/**
 * Booking Total Costing rollup (simplified: no booking-level GST / professional fees).
 */

const {
  toNumber,
  round2,
  hotelInputCost,
  hotelServiceCharge,
  vehicleInputCost,
  vehicleServiceCharge,
  serviceInputCost,
  serviceServiceCharge,
  journeyInputCost,
  journeyTotalServiceCharge,
} = require("./lineCostingMath");

/**
 * @param {object} booking
 * @param {object} costingInput
 */
const buildTourProTotals = (booking, costingInput = {}) => {
  const hotels = booking.hotelBookings || [];
  const vehicles = booking.vehicleBookings || [];
  const services = booking.serviceBookings || [];
  const journeys = booking.journeyBookings || [];
  const isPackage = Boolean(booking.isPackage);
  const isJourney = Boolean(booking.isJourney);

  const hotelTotal = hotels.reduce((s, r) => s + hotelInputCost(r), 0);
  const hotelCommFromLines = hotels.reduce(
    (s, r) => s + hotelServiceCharge(r),
    0
  );
  const vehicleTotal = vehicles.reduce((s, r) => s + vehicleInputCost(r), 0);
  const vehicleCommFromLines = vehicles.reduce(
    (s, r) => s + vehicleServiceCharge(r),
    0
  );
  const serviceTotal = services.reduce((s, r) => s + serviceInputCost(r), 0);
  const serviceCommFromLines = services.reduce(
    (s, r) => s + serviceServiceCharge(r),
    0
  );
  const journeyCostFromLines = journeys.reduce(
    (s, r) => s + journeyInputCost(r),
    0
  );
  const journeyCommFromLines = journeys.reduce(
    (s, r) => s + journeyTotalServiceCharge(r),
    0
  );

  const hotelComm =
    costingInput.hotelServiceCharge != null &&
    costingInput.hotelServiceCharge !== ""
      ? toNumber(costingInput.hotelServiceCharge)
      : hotelCommFromLines;
  const vehicleComm =
    costingInput.vehicleServiceCharge != null &&
    costingInput.vehicleServiceCharge !== ""
      ? toNumber(costingInput.vehicleServiceCharge)
      : vehicleCommFromLines;
  const serviceComm =
    costingInput.otherServicesServiceCharge != null &&
    costingInput.otherServicesServiceCharge !== ""
      ? toNumber(costingInput.otherServicesServiceCharge)
      : serviceCommFromLines;
  const journeyComm =
    costingInput.journeyServiceCharge != null &&
    costingInput.journeyServiceCharge !== ""
      ? toNumber(costingInput.journeyServiceCharge)
      : journeyCommFromLines;

  const journeyCost = round2(journeyCostFromLines);
  const packageJourney = round2(journeyCost + journeyComm);

  const beforePackageCost = round2(hotelTotal + vehicleTotal + serviceTotal);
  const beforePackageServiceCharge = round2(
    hotelComm + vehicleComm + serviceComm
  );
  const beforePackageTotalCost = round2(
    beforePackageCost + beforePackageServiceCharge
  );

  const serviceAmt = round2(serviceTotal + serviceComm);

  // Package: package cost (on cost) + service charge on package
  let serviceChargeOnCost = 0;
  let serviceChargeOnPackage = 0;
  if (isPackage) {
    if (
      costingInput.serviceChargeOnCost != null &&
      costingInput.serviceChargeOnCost !== ""
    ) {
      serviceChargeOnCost = toNumber(costingInput.serviceChargeOnCost);
    } else if (costingInput.beforePackageCost != null) {
      serviceChargeOnCost = round2(
        toNumber(costingInput.packageCost) -
          toNumber(costingInput.beforePackageCost)
      );
      if (serviceChargeOnCost < 0) serviceChargeOnCost = 0;
    }
    if (
      costingInput.serviceChargeOnPackage != null &&
      costingInput.serviceChargeOnPackage !== ""
    ) {
      serviceChargeOnPackage = toNumber(costingInput.serviceChargeOnPackage);
    }
  }

  const totalServiceCharge = round2(
    serviceChargeOnCost + serviceChargeOnPackage
  );
  const packageCost = round2(beforePackageCost + serviceChargeOnCost);
  const packageServiceCharge = round2(
    beforePackageServiceCharge + serviceChargeOnPackage
  );
  const packageTotalCost = round2(
    beforePackageTotalCost + totalServiceCharge
  );

  const discount = toNumber(costingInput.discount);
  const gstAmount = 0;
  const gstPercent = 0;
  const gstOn = null;
  const inclusiveServiceTax = false;

  const totalPackageCost = round2(packageTotalCost - discount);
  const journeyPart = isJourney ? packageJourney : 0;
  const payableAmount = round2(journeyPart + totalPackageCost);

  return {
    journeyBookingAmount: journeyCost,
    journeyServiceChargeFromLines: round2(journeyCommFromLines),
    journeyServiceCharge: round2(journeyComm),
    journeyTotalCost: packageJourney,

    hotelBookingAmount: round2(hotelTotal),
    vehicleBookingAmount: round2(vehicleTotal),
    otherServicesAmount: round2(serviceTotal),
    hotelServiceChargeFromLines: round2(hotelCommFromLines),
    vehicleServiceChargeFromLines: round2(vehicleCommFromLines),
    otherServicesServiceChargeFromLines: round2(serviceCommFromLines),
    hotelServiceCharge: round2(hotelComm),
    vehicleServiceCharge: round2(vehicleComm),
    otherServicesServiceCharge: round2(serviceComm),
    hotelTotalCost: round2(hotelTotal + hotelComm),
    vehicleTotalCost: round2(vehicleTotal + vehicleComm),
    otherServicesTotalCost: round2(serviceTotal + serviceComm),

    packageJourney,
    serviceAmt,
    beforePackageCost,
    beforePackageServiceCharge,
    beforePackageTotalCost,
    serviceChargeOnCost,
    serviceChargeOnPackage,
    totalServiceCharge,
    packageCost,
    packageServiceCharge,
    packageTotalCost,

    discount,
    gstOn,
    gstPercent,
    gstAmount,
    inclusiveServiceTax,
    totalPackageCost,
    grandTotalPackageAmount: totalPackageCost,
    payableAmount,
    totalPayableAmount: payableAmount,
    inputCommission: 0,
    commissionAmount: 0,

    isPackage,
    isJourney,
  };
};

module.exports = {
  buildTourProTotals,
};
