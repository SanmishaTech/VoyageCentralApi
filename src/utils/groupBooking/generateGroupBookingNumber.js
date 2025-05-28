const dayjs = require("dayjs");

/**
 * Generates a booking number in the format '2025-26/001'.
 * @param {Prisma.TransactionClient} tx - Prisma transaction client.
 * @param {number} agencyId - The agency ID to filter by.
 * @returns {Promise<string>} Booking number.
 */
async function generateGroupBookingNumber(tx, agencyId) {
  const now = dayjs();

  // Determine the financial year (starts in April)
  const financialYearStart = now.month() >= 3 ? now.year() : now.year() - 1;
  const financialYearEnd = financialYearStart + 1;

  // Format financial year as '2025-26'
  const financialYear = `${financialYearStart}-${String(financialYearEnd).slice(
    -2
  )}`;

  // Get the latest booking number for the current financial year
  const lastBooking = await tx.groupBooking.findFirst({
    where: {
      AND: [
        {
          groupBookingNumber: {
            startsWith: financialYear,
          },
        },
        { agencyId },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  let nextNumber = 1;

  if (lastBooking?.groupBookingNumber) {
    const parts = lastBooking.groupBookingNumber.split("/");
    const lastNumber = parseInt(parts[1], 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  const paddedNumber = String(nextNumber).padStart(3, "0");
  return `${financialYear}/${paddedNumber}`;
}

module.exports = generateGroupBookingNumber;
