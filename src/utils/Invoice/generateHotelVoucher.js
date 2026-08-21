const PdfPrinter = require("pdfmake");
const fs = require("fs");
const path = require("path");
const { toWords } = require("number-to-words");

const vfsCandidate = require("pdfmake/build/vfs_fonts.js");
let vfsData = null;
if (vfsCandidate?.pdfMake?.vfs) vfsData = vfsCandidate.pdfMake.vfs;
else if (vfsCandidate?.vfs) vfsData = vfsCandidate.vfs;
else vfsData = vfsCandidate || {};

const fonts = {
  Roboto: {
    normal: vfsData["Roboto-Regular.ttf"]
      ? Buffer.from(vfsData["Roboto-Regular.ttf"], "base64")
      : undefined,
    bold: vfsData["Roboto-Medium.ttf"]
      ? Buffer.from(vfsData["Roboto-Medium.ttf"], "base64")
      : undefined,
  },
};
Object.keys(fonts.Roboto).forEach((k) => {
  if (!fonts.Roboto[k]) delete fonts.Roboto[k];
});
const printer = new PdfPrinter(fonts);

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const num = (n) => Number(n || 0);

const countToWords = (n) => {
  const value = num(n);
  if (!value) return String(n == null ? "" : n);
  try {
    return toWords(value);
  } catch (_) {
    return String(value);
  }
};

const tableLayout = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
};

const cell = (text, opts = {}) => ({
  text: text == null ? "" : String(text),
  style: "tableCell",
  ...opts,
});

const boldCell = (text, opts = {}) => ({
  text: text == null ? "" : String(text),
  style: "boldText",
  ...opts,
});

const buildPaxText = (data) => {
  const adults = num(data.numberOfAdults);
  const children5To11 = num(data.numberOfChildren5To11);
  const childrenUnder5 = num(data.numberOfChildrenUnder5);
  const total =
    data.totalTravelers != null
      ? num(data.totalTravelers)
      : adults + children5To11 + childrenUnder5;

  let text = `${total} (Adults : ${adults})`;
  if (children5To11) {
    text += `  (Children between 5 to 11 years: ${children5To11} )`;
  }
  if (childrenUnder5) {
    text += `  (Children below 5 years: ${childrenUnder5} )`;
  }
  return text;
};

const pushAgencyHeader = (content, company) => {
  const companyAddress = (company.addressLines || []).join("\n");
  content.push({
    columns: [
      company.logoPath && fs.existsSync(company.logoPath)
        ? { image: company.logoPath, width: 70 }
        : { text: "", width: 70 },
      {
        width: "*",
        alignment: "center",
        stack: [
          { text: company.name || "", style: "companyName" },
          companyAddress ? { text: companyAddress, style: "smallCenter" } : {},
          {
            text: [
              company.phone ? `Mobile: ${company.phone}` : "",
              company.email ? `Email: ${company.email}` : "",
            ]
              .filter(Boolean)
              .join("  |  "),
            style: "smallCenter",
          },
        ],
      },
      { text: "", width: 70 },
    ],
  });
  content.push({
    canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }],
    margin: [0, 8, 0, 10],
  });
};

/**
 * Hotel Reservation Voucher PDF (TourPro hotel_voucher_print style).
 */
const generateHotelVoucher = async (data, filePath) => {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) fs.mkdirSync(dirname, { recursive: true });

  const {
    agencyDetails = {},
    hotelName,
    hotelAddress,
    hotelPhone,
    bookingNumber,
    hotelBookingDate,
    hrvNumber,
    guestName,
    numberOfAdults,
    numberOfChildren5To11,
    numberOfChildrenUnder5,
    totalTravelers,
    rooms,
    accommodationName,
    accommodationNote,
    checkInDate,
    checkOutDate,
    nights,
    plan,
    cityName,
    bookingConfirmedBy,
    confirmationNumber,
    notes,
    specialRequirement,
    billingInstructions,
  } = data;

  const company = agencyDetails;
  const content = [];
  pushAgencyHeader(content, company);

  content.push({
    text: "HOTEL RESERVATION VOUCHER",
    style: "docTitle",
    alignment: "center",
    decoration: "underline",
    margin: [0, 0, 0, 14],
  });

  // To / Hotel / Address / Phone + File No / Date / HRV
  content.push({
    table: {
      widths: ["25%", "15%", "25%", "35%"],
      body: [
        [
          {
            text: "To,\nThe Manager.",
            style: "boldText",
            rowSpan: 3,
            margin: [0, 8, 0, 0],
          },
          boldCell("Hotel"),
          { text: hotelName || "", style: "boldText", colSpan: 2 },
          {},
        ],
        [
          {},
          boldCell("Address"),
          { text: hotelAddress || "", style: "tableCell", colSpan: 2 },
          {},
        ],
        [
          {},
          boldCell("Phone"),
          { text: hotelPhone || "", style: "tableCell", colSpan: 2 },
          {},
        ],
        [
          {
            text: "File No.",
            style: "boldText",
            rowSpan: 2,
            margin: [0, 6, 0, 0],
          },
          {
            text: bookingNumber || "",
            style: "tableCell",
            rowSpan: 2,
            margin: [0, 6, 0, 0],
          },
          boldCell("Date"),
          cell(formatDate(hotelBookingDate)),
        ],
        [{}, {}, boldCell("HRV No."), cell(hrvNumber || "")],
      ],
    },
    layout: tableLayout,
    margin: [0, 0, 0, 10],
  });

  content.push({
    text: "Guest Details :-",
    style: "sectionTitle",
    margin: [0, 4, 0, 6],
  });
  content.push({
    table: {
      widths: ["25%", "*"],
      body: [
        [boldCell("Guest"), cell(guestName || "")],
        [
          boldCell("Total No. of Pax"),
          cell(
            buildPaxText({
              numberOfAdults,
              numberOfChildren5To11,
              numberOfChildrenUnder5,
              totalTravelers,
            })
          ),
        ],
      ],
    },
    layout: tableLayout,
    margin: [0, 0, 0, 10],
  });

  content.push({
    text: "Booking Details :-",
    style: "sectionTitle",
    margin: [0, 4, 0, 6],
  });

  const nightsNum = num(nights);
  const nightsLabel = `${countToWords(nightsNum)}${
    nightsNum === 1 ? " Night" : " Nights"
  }`;
  const roomsLabel = countToWords(rooms);
  const accommodationParts = [
    roomsLabel,
    accommodationName || "",
    accommodationNote || "",
  ]
    .filter(Boolean)
    .join(" ");

  const stayBody = [
    [boldCell("No. of Rooms"), { text: roomsLabel, colSpan: 2, style: "tableCell" }, {}],
    [
      boldCell("Type of Accommodation"),
      { text: accommodationParts, colSpan: 2, style: "tableCell" },
      {},
    ],
    [
      boldCell("Check In"),
      { text: formatDate(checkInDate), colSpan: 2, style: "tableCell" },
      {},
    ],
    [
      boldCell("Check Out"),
      { text: formatDate(checkOutDate), colSpan: 2, style: "tableCell" },
      {},
    ],
    [
      boldCell("Total Nights"),
      cell(nightsLabel),
      { text: `Meal Plan : ${plan || ""}`, style: "boldText" },
    ],
  ];
  if (cityName) {
    stayBody.push([
      boldCell("City"),
      { text: cityName, colSpan: 2, style: "tableCell" },
      {},
    ]);
  }

  content.push({
    table: {
      widths: ["25%", "35%", "*"],
      body: stayBody,
    },
    layout: tableLayout,
    margin: [0, 0, 0, 10],
  });

  const confirmRows = [];
  if (bookingConfirmedBy) {
    confirmRows.push([
      boldCell("Booking Confirmed\nPhone / Email By"),
      cell(bookingConfirmedBy),
    ]);
  }
  if (confirmationNumber) {
    confirmRows.push([boldCell("Confirmation No."), cell(confirmationNumber)]);
  }
  if (notes) {
    confirmRows.push([boldCell("Notes"), cell(notes)]);
  }
  if (confirmRows.length > 0) {
    content.push({
      table: {
        widths: ["25%", "*"],
        body: confirmRows,
      },
      layout: tableLayout,
      margin: [0, 0, 0, 10],
    });
  }

  if (specialRequirement) {
    content.push({
      table: {
        widths: ["25%", "*"],
        body: [[boldCell("Special Request"), cell(specialRequirement)]],
      },
      layout: tableLayout,
      margin: [0, 0, 0, 10],
    });
  }

  if (billingInstructions) {
    content.push({
      table: {
        widths: ["25%", "*"],
        body: [
          [
            boldCell("Billing Instruction"),
            { text: billingInstructions, style: "boldText" },
          ],
        ],
      },
      layout: tableLayout,
      margin: [0, 0, 0, 10],
    });
  }

  content.push({
    table: {
      widths: ["*"],
      body: [
        [
          {
            text: "GOVERNMENT RULE : For Indian National, Photo Identity Proof Compulsory at the time of Check-In at all Hotels. Foreign National must carry Passport (With Valid Visa).",
            style: "boldText",
          },
        ],
      ],
    },
    layout: tableLayout,
  });

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [40, 50, 40, 50],
    content,
    styles: {
      companyName: { fontSize: 14, bold: true },
      docTitle: { fontSize: 12, bold: true },
      sectionTitle: { fontSize: 10, bold: true },
      boldText: { fontSize: 10, bold: true },
      tableCell: { fontSize: 9 },
      smallCenter: { fontSize: 8, alignment: "center" },
    },
    defaultStyle: { font: "Roboto" },
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  await new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(filePath);
    pdfDoc.pipe(stream);
    pdfDoc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
};

module.exports = generateHotelVoucher;
