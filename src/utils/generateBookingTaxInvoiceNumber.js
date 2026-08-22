const dayjs = require("dayjs");

/**
 * Agency-scoped booking tax invoice number: J/YYYY-YY/NNN
 * Matches TourPro "J/" + booking_no spirit, but sequences per agency FY.
 */
async function generateBookingTaxInvoiceNumber(tx, agencyId) {
  const now = dayjs();
  const financialYearStart = now.month() >= 3 ? now.year() : now.year() - 1;
  const financialYearEnd = financialYearStart + 1;
  const financialYear = `${financialYearStart}-${String(financialYearEnd).slice(
    -2
  )}`;
  const prefix = `J/${financialYear}/`;

  const last = await tx.booking.findFirst({
    where: {
      agencyId,
      taxInvoiceNumber: { startsWith: prefix },
    },
    orderBy: { taxInvoiceDate: "desc" },
  });

  let nextNumber = 1;
  if (last?.taxInvoiceNumber) {
    const parts = last.taxInvoiceNumber.split("/");
    const lastNumber = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNumber)) nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
}

module.exports = generateBookingTaxInvoiceNumber;
