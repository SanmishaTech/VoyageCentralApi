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
 * Vehicle Reservation Voucher PDF (TourPro vehicle_voucher_print style).
 */
const generateVehicleVoucher = async (data, filePath) => {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) fs.mkdirSync(dirname, { recursive: true });

  const {
    agencyDetails = {},
    bookingNumber,
    vehicleBookingDate,
    vehicleHrvNumber,
    guestName,
    totalTravelers,
    numberOfAdults,
    numberOfChildren5To11,
    numberOfChildrenUnder5,
    guestContact,
    agentName,
    agentContact,
    numberOfVehicles,
    vehicleName,
    vehicleNote,
    fromDate,
    toDate,
    days,
    pickupPlace,
    cityName,
    summaryNote,
    terms,
    specialRequest,
    specialNote,
  } = data;

  const company = agencyDetails;
  const content = [];
  pushAgencyHeader(content, company);

  content.push({
    text: "VEHICLE RESERVATION VOUCHER",
    style: "docTitle",
    alignment: "center",
    decoration: "underline",
    margin: [0, 0, 0, 14],
  });

  const adults = num(numberOfAdults);
  const children5To11 = num(numberOfChildren5To11);
  const childrenUnder5 = num(numberOfChildrenUnder5);
  const pax =
    totalTravelers != null
      ? num(totalTravelers)
      : adults + children5To11 + childrenUnder5;

  const vehicleLabel = [
    countToWords(numberOfVehicles),
    vehicleName || "",
    vehicleNote || "",
  ]
    .filter(Boolean)
    .join(" ");

  content.push({
    table: {
      widths: ["25%", "25%", "25%", "25%"],
      body: [
        [
          boldCell("File No"),
          cell(bookingNumber || ""),
          boldCell("Date"),
          cell(formatDate(vehicleBookingDate)),
        ],
        [
          boldCell("VRV No"),
          cell(vehicleHrvNumber || ""),
          boldCell("Guest Name"),
          cell(guestName || ""),
        ],
        [
          boldCell("Total Pax."),
          cell(`${pax} Pax`),
          boldCell("Guest Contact"),
          cell(guestContact || ""),
        ],
        [
          boldCell("Agent Name"),
          cell(agentName || ""),
          boldCell("Agent Contact"),
          cell(agentContact || ""),
        ],
      ],
    },
    layout: tableLayout,
    margin: [0, 0, 0, 0],
  });

  content.push({
    table: {
      widths: ["25%", "*"],
      body: [
        [boldCell("Vehicle"), cell(vehicleLabel)],
        [
          boldCell("From / To"),
          cell(`${formatDate(fromDate)}  -  ${formatDate(toDate)}`),
        ],
        [boldCell("No Of Days"), cell(days != null ? String(days) : "")],
        [boldCell("Pickup"), cell(pickupPlace || "")],
        cityName ? [boldCell("City"), cell(cityName)] : null,
        summaryNote ? [boldCell("Summary"), cell(summaryNote)] : null,
        terms ? [boldCell("Terms"), cell(terms)] : null,
        specialRequest ? [boldCell("Special Request"), cell(specialRequest)] : null,
      ].filter(Boolean),
    },
    layout: tableLayout,
    margin: [0, 0, 0, 10],
  });

  content.push({
    table: {
      widths: ["*"],
      body: [
        [
          {
            text: "NOTE : Your Driver to carry a placard [Board] in the name of Guest Name in case of Airport / Railway Stations Pickups. Knowledge of Hindi / English is must for your driver.",
            style: "boldText",
          },
        ],
      ],
    },
    layout: tableLayout,
    margin: [0, 0, 0, 8],
  });

  if (specialNote) {
    content.push({
      table: {
        widths: ["*"],
        body: [
          [
            {
              text: [{ text: "SPECIAL NOTE :\n", bold: true }, specialNote],
              style: "tableCell",
            },
          ],
        ],
      },
      layout: tableLayout,
    });
  }

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [40, 50, 40, 50],
    content,
    styles: {
      companyName: { fontSize: 14, bold: true },
      docTitle: { fontSize: 12, bold: true },
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

module.exports = generateVehicleVoucher;
