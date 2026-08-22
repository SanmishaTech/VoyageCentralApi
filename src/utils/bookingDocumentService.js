const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { numberToWords } = require("./numberToWords");
const { buildTourProTotals } = require("./bookingCostingMath");
const {
  toNumber,
  round2,
  journeyInputCost,
  journeyTotalCost,
  hotelInputCost,
  vehicleInputCost,
  serviceInputCost,
} = require("./lineCostingMath");
const {
  buildAgencyDetails,
  buildClientDetails,
} = require("./Invoice/agencyClientDetails");
const generateBookingTaxInvoice = require("./Invoice/generateBookingTaxInvoice");
const generateBookingQuotation = require("./Invoice/generateBookingQuotation");
const generateBookingEstimate = require("./Invoice/generateBookingEstimate");
const generatePackageSummary = require("./Invoice/generatePackageSummary");
const generateBookingTaxInvoiceNumber = require("./generateBookingTaxInvoiceNumber");

const invoicesRoot = path.join(__dirname, "..", "..", "invoices", "booking");

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const buildInvoiceItems = (booking, totals) => {
  const items = [];
  let sr = 1;
  const isPackage = Boolean(booking.isPackage);

  (booking.journeyBookings || []).forEach((j) => {
    const desc = [
      "Journey",
      j.mode,
      j.fromPlace && j.toPlace ? `${j.fromPlace} → ${j.toPlace}` : null,
      j.billDescription,
    ]
      .filter(Boolean)
      .join(" - ");
    items.push({
      srNo: sr++,
      description: desc,
      amount: isPackage ? journeyInputCost(j) : journeyTotalCost(j) || journeyInputCost(j),
    });
  });

  if (isPackage) {
    const packageDescParts = [];
    (booking.hotelBookings || []).forEach((h) => {
      packageDescParts.push(
        `Hotel: ${h.hotel?.hotelName || "Hotel"}${h.billDescription ? ` (${h.billDescription})` : ""}`
      );
    });
    (booking.vehicleBookings || []).forEach((v) => {
      packageDescParts.push(
        `Vehicle: ${v.vehicle?.vehicleName || "Vehicle"}${v.billDescription ? ` (${v.billDescription})` : ""}`
      );
    });
    (booking.serviceBookings || []).forEach((s) => {
      packageDescParts.push(s.description || s.service?.serviceName || "Service");
    });

    items.push({
      srNo: sr++,
      description:
        packageDescParts.length > 0
          ? `Package\n${packageDescParts.join("\n")}`
          : "Package",
      amount: totals.packageCost,
    });

    if (toNumber(totals.serviceChargeOnPackage) !== 0) {
      items.push({
        srNo: sr++,
        description: booking.bookingCosting?.billDescription
          ? `Professional Fees - ${booking.bookingCosting.billDescription}`
          : "Professional Fees",
        amount: totals.serviceChargeOnPackage,
      });
    }
  } else {
    (booking.hotelBookings || []).forEach((h) => {
      items.push({
        srNo: sr++,
        description: `Hotel - ${h.hotel?.hotelName || ""}${h.billDescription ? `: ${h.billDescription}` : ""}`,
        amount: hotelInputCost(h),
      });
    });
    (booking.vehicleBookings || []).forEach((v) => {
      items.push({
        srNo: sr++,
        description: `Vehicle - ${v.vehicle?.vehicleName || ""}${v.billDescription ? `: ${v.billDescription}` : ""}`,
        amount: vehicleInputCost(v),
      });
    });
    (booking.serviceBookings || []).forEach((s) => {
      items.push({
        srNo: sr++,
        description: s.description || s.service?.serviceName || "Service",
        amount: serviceInputCost(s),
      });
    });
    if (toNumber(totals.packageServiceCharge) !== 0) {
      items.push({
        srNo: sr++,
        description: "Professional Fees",
        amount: totals.packageServiceCharge,
      });
    }
  }

  return items;
};

/**
 * Regenerate quotation + tax invoice PDFs for a confirmed booking (TourPro triggers).
 */
async function regenerateBookingDocuments(tx, bookingId, agencyId) {
  const booking = await tx.booking.findFirst({
    where: { id: bookingId, agencyId },
    include: {
      agency: { include: { banks: { orderBy: { id: "asc" }, take: 1 } } },
      client: { include: { city: true } },
      tour: true,
      bookingCosting: true,
      bookingDetails: { include: { city: true }, orderBy: { day: "asc" } },
      journeyBookings: { include: { airline: true } },
      hotelBookings: { include: { hotel: true, city: true } },
      vehicleBookings: { include: { vehicle: true, city: true } },
      serviceBookings: { include: { service: true } },
    },
  });

  if (!booking || booking.bookingType !== "Confirm") {
    return null;
  }

  const costing = booking.bookingCosting || {};
  const totals = buildTourProTotals(booking, costing);
  const amountInWords = numberToWords(totals.payableAmount);
  const agencyDetails = buildAgencyDetails(booking.agency);
  const client = buildClientDetails(booking.client);

  const journeys = (booking.journeyBookings || []).map((j) => ({
    mode: j.mode || "",
    fromPlace: j.fromPlace || "",
    toPlace: j.toPlace || "",
    flightNumber: j.flightNumber || "",
    trainNumber: j.trainNumber || "",
    busName: j.busName || "",
    airlineName: j.airline?.airlineName || j.airline?.airline || "",
    billDescription: j.billDescription || "",
    inputCost: journeyInputCost(j),
    totalCost: journeyTotalCost(j),
    amount: journeyInputCost(j),
  }));

  const hotels = (booking.hotelBookings || []).map((h) => ({
    hotelName: h.hotel?.hotelName || "",
    cityName: h.city?.cityName || h.hotel?.cityName || "",
    rooms: h.rooms,
    nights: h.nights,
    billDescription: h.billDescription || "",
    inputCost: hotelInputCost(h),
  }));

  const vehicles = (booking.vehicleBookings || []).map((v) => ({
    numberOfVehicles: v.numberOfVehicles,
    vehicleName: v.vehicle?.vehicleName || v.vehicle?.vehicle || "",
    cityName: v.city?.cityName || "",
    summaryNote: v.summaryNote || "",
    inputCost: vehicleInputCost(v),
  }));

  const services = (booking.serviceBookings || []).map((s) => ({
    description: s.description || s.service?.serviceName || "Service",
    inputCost: serviceInputCost(s),
  }));

  const taxCosting = {
    serviceChargeOnCost: totals.serviceChargeOnCost,
    serviceChargeOnPackage: totals.serviceChargeOnPackage,
    packageCost: totals.packageCost,
    packageServiceCharge: totals.packageServiceCharge,
    discount: totals.discount,
    gstOn: costing.gstOn || totals.gstOn,
    gstPercent:
      costing.gstPercent != null && costing.gstPercent !== ""
        ? toNumber(costing.gstPercent)
        : totals.gstPercent,
    gstAmount:
      costing.gstAmount != null && costing.gstAmount !== ""
        ? toNumber(costing.gstAmount)
        : totals.gstAmount,
    totalPackageCost: totals.totalPackageCost,
    payableAmount: totals.payableAmount,
    amountInWords,
    billDescription: costing.billDescription || "",
  };

  const folder = path.join(invoicesRoot, "taxInvoice", String(bookingId));
  ensureDir(folder);

  // Tax invoice number (agency-scoped) — assign once, keep thereafter
  let taxInvoiceNumber = booking.taxInvoiceNumber;
  if (!taxInvoiceNumber) {
    taxInvoiceNumber = await generateBookingTaxInvoiceNumber(tx, agencyId);
  }
  const taxInvoiceDate = booking.taxInvoiceDate || new Date();
  const taxFileName = `${uuidv4()}.pdf`;
  const taxFilePath = path.join(folder, taxFileName);

  await generateBookingTaxInvoice(
    {
      invoiceNumber: taxInvoiceNumber,
      invoiceDate: taxInvoiceDate,
      bookingNumber: booking.bookingNumber,
      isPackage: booking.isPackage,
      client,
      agencyDetails,
      journeys,
      hotels,
      vehicles,
      services,
      costing: taxCosting,
    },
    taxFilePath
  );

  const planShort = (plan) => {
    if (!plan) return "";
    if (plan.includes("EP")) return "EP";
    if (plan.includes("CP")) return "CP";
    if (plan.includes("MAP")) return "MAP";
    if (plan.includes("AP")) return "AP";
    return plan;
  };

  const bookingDetailsPayload = (booking.bookingDetails || []).map((d) => ({
    date: d.date,
    description: d.description,
    cityName: d.city?.cityName || "",
  }));

  const journeysPayload = (booking.journeyBookings || []).map((j) => ({
    fromDepartureDate: j.fromDepartureDate,
    toArrivalDate: j.toArrivalDate,
    mode: j.mode,
    fromPlace: j.fromPlace,
    toPlace: j.toPlace,
    trainNumber: j.trainNumber,
    trainName: j.trainName,
    pnrNumber: j.pnrNumber,
    flightNumber: j.flightNumber,
    airlineName: j.airline?.airlineName || "",
    busName: j.busName,
    amount: journeyTotalCost(j) || journeyInputCost(j),
    totalCost: journeyTotalCost(j) || journeyInputCost(j),
  }));

  const hotelsPayload = (booking.hotelBookings || []).map((h) => ({
    checkInDate: h.checkInDate,
    checkOutDate: h.checkOutDate,
    hotelName: h.hotel?.hotelName || "",
    cityName: h.city?.cityName || h.hotel?.cityName || "",
    rooms: h.rooms,
    plan: planShort(h.plan),
    nights: h.nights,
    inputCost: hotelInputCost(h),
    totalCost:
      h.totalCost != null && h.totalCost !== ""
        ? toNumber(h.totalCost)
        : round2(hotelInputCost(h) + toNumber(h.serviceCharge)),
  }));

  const vehiclesPayload = (booking.vehicleBookings || []).map((v) => ({
    fromDate: v.fromDate,
    toDate: v.toDate,
    detail: v.summaryNote || v.billDescription || v.vehicleNote || "",
    days: v.days,
    inputCost: vehicleInputCost(v),
    totalCost:
      v.totalCost != null && v.totalCost !== ""
        ? toNumber(v.totalCost)
        : round2(vehicleInputCost(v) + toNumber(v.serviceCharge)),
  }));

  const servicesPayload = (booking.serviceBookings || []).map((s) => ({
    serviceName: s.service?.serviceName || "Service",
    description: s.description || "",
    cost: serviceInputCost(s) || toNumber(s.cost) || toNumber(s.totalCost),
  }));

  const quoteFolder = path.join(invoicesRoot, "quotation", String(bookingId));
  ensureDir(quoteFolder);
  const quoteFileName = `${uuidv4()}.pdf`;
  const quoteFilePath = path.join(quoteFolder, quoteFileName);

  // Quotation (TourPro quotation_print) — rich itinerary + lettered costing
  await generateBookingQuotation(
    {
      agencyDetails,
      client,
      tourTitle: booking.tour?.tourTitle || booking.tour?.title || "",
      bookingType: booking.bookingType,
      journeyDate: booking.journeyDate,
      numberOfAdults: booking.numberOfAdults,
      numberOfChildren5To11: booking.numberOfChildren5To11,
      numberOfChildrenUnder5: booking.numberOfChildrenUnder5,
      totalTravelers: booking.totalTravelers,
      bookingDetails: bookingDetailsPayload,
      journeys: journeysPayload,
      hotels: hotelsPayload,
      vehicles: vehiclesPayload,
      services: servicesPayload,
      costing: {
        packageServiceCharge: totals.packageServiceCharge,
        totalServiceCharge: totals.totalServiceCharge,
        discount: totals.discount,
        payableAmount: totals.payableAmount,
        amountInWords,
        gstAmount:
          costing.gstAmount != null && costing.gstAmount !== ""
            ? toNumber(costing.gstAmount)
            : totals.gstAmount,
        gstPercent:
          costing.gstPercent != null && costing.gstPercent !== ""
            ? toNumber(costing.gstPercent)
            : totals.gstPercent,
      },
    },
    quoteFilePath
  );

  // Package Summary (TourPro package_quotation_print)
  const summaryFolder = path.join(
    invoicesRoot,
    "packageSummary",
    String(bookingId)
  );
  ensureDir(summaryFolder);
  const summaryFileName = `${uuidv4()}.pdf`;
  const summaryFilePath = path.join(summaryFolder, summaryFileName);

  await generatePackageSummary(
    {
      agencyDetails,
      client,
      tourTitle: booking.tour?.tourTitle || booking.tour?.title || "",
      bookingType: booking.bookingType,
      journeyDate: booking.journeyDate,
      numberOfAdults: booking.numberOfAdults,
      numberOfChildren5To11: booking.numberOfChildren5To11,
      numberOfChildrenUnder5: booking.numberOfChildrenUnder5,
      totalTravelers: booking.totalTravelers,
      bookingDetails: bookingDetailsPayload,
      hotels: hotelsPayload,
      vehicles: vehiclesPayload,
      journeys: journeysPayload,
      services: servicesPayload,
      costing: {
        serviceChargeOnCost: totals.serviceChargeOnCost,
        packageCost: totals.packageCost,
        serviceChargeOnPackage: totals.serviceChargeOnPackage,
        discount: totals.discount,
        payableAmount: totals.payableAmount,
        amountInWords,
      },
    },
    summaryFilePath
  );

  // Remove old PDFs if paths differ
  const relTax = path.relative(path.join(__dirname, "..", ".."), taxFilePath);
  const relQuote = path.relative(path.join(__dirname, "..", ".."), quoteFilePath);
  const relSummary = path.relative(
    path.join(__dirname, "..", ".."),
    summaryFilePath
  );

  const unlinkIfDifferent = (relOld, newPath) => {
    if (!relOld) return;
    const old = path.join(__dirname, "..", "..", relOld);
    if (fs.existsSync(old) && old !== newPath) {
      try {
        fs.unlinkSync(old);
      } catch (_) {}
    }
  };
  unlinkIfDifferent(booking.taxInvoicePath, taxFilePath);
  unlinkIfDifferent(booking.quotationPath, quoteFilePath);
  unlinkIfDifferent(booking.packageSummaryPath, summaryFilePath);

  await tx.booking.update({
    where: { id: bookingId },
    data: {
      taxInvoiceNumber,
      taxInvoiceDate,
      taxInvoicePath: relTax,
      quotationPath: relQuote,
      packageSummaryPath: relSummary,
    },
  });

  if (booking.bookingCosting) {
    await tx.bookingCosting.update({
      where: { bookingId },
      data: { amountInWords },
    });
  }

  return {
    taxInvoiceNumber,
    taxInvoicePath: relTax,
    quotationPath: relQuote,
    packageSummaryPath: relSummary,
  };
}

/**
 * Generate estimate PDF from enquiry costing lines.
 */
async function regenerateEstimateDocument(tx, bookingId, agencyId) {
  const booking = await tx.booking.findFirst({
    where: { id: bookingId, agencyId },
    include: {
      agency: true,
      client: { include: { city: true } },
      enquiryCostings: true,
    },
  });
  if (!booking) return null;

  const lines = booking.enquiryCostings || [];
  const totalPackageCost = lines.reduce((s, l) => s + toNumber(l.cost), 0);
  const agencyDetails = buildAgencyDetails(booking.agency);
  const client = buildClientDetails(booking.client);

  const folder = path.join(invoicesRoot, "estimate", String(bookingId));
  ensureDir(folder);
  const fileName = `${uuidv4()}.pdf`;
  const filePath = path.join(folder, fileName);

  await generateBookingEstimate(
    {
      bookingNumber: booking.bookingNumber,
      client,
      agencyDetails,
      lines,
      totalPackageCost,
      costingNote: booking.costingNote,
    },
    filePath
  );

  if (booking.estimatePath) {
    const old = path.join(__dirname, "..", "..", booking.estimatePath);
    if (fs.existsSync(old) && old !== filePath) {
      try {
        fs.unlinkSync(old);
      } catch (_) {}
    }
  }

  const rel = path.relative(path.join(__dirname, "..", ".."), filePath);
  await tx.booking.update({
    where: { id: bookingId },
    data: { estimatePath: rel },
  });

  return { estimatePath: rel, totalPackageCost };
}

module.exports = {
  regenerateBookingDocuments,
  regenerateEstimateDocument,
  buildInvoiceItems,
};
