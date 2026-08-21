const PdfPrinter = require("pdfmake");
const fs = require("fs");
const path = require("path");

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
    italics: vfsData["Roboto-Italic.ttf"]
      ? Buffer.from(vfsData["Roboto-Italic.ttf"], "base64")
      : undefined,
    bolditalics: vfsData["Roboto-MediumItalic.ttf"]
      ? Buffer.from(vfsData["Roboto-MediumItalic.ttf"], "base64")
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

const formatTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
};

const money = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const num = (n) => Number(n || 0);

const isNonZero = (n) => num(n) !== 0;

const tableLayout = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
};

const headerCell = (text, opts = {}) => ({
  text,
  style: "tableHeader",
  ...opts,
});

const cell = (text, opts = {}) => ({
  text: text == null ? "" : String(text),
  style: "tableCell",
  ...opts,
});

const cellRight = (text, opts = {}) => ({
  text: text == null ? "" : String(text),
  style: "tableCellRight",
  ...opts,
});

const sectionTitle = (text) => ({
  text,
  style: "sectionTitle",
  margin: [0, 10, 0, 6],
});

const journeyCost = (j) => {
  if (j.totalCost != null && j.totalCost !== "") return num(j.totalCost);
  return num(j.amount) + num(j.serviceCharge);
};

const buildJourneyDetails = (j) => {
  const lines = [
    j.mode || "",
    `From : ${j.fromPlace || ""} To ${j.toPlace || ""}`,
    `Departure Date : ${formatDate(j.fromDepartureDate)}  Departure Time : ${formatTime(
      j.fromDepartureDate
    )}`,
    `Arrival Date : ${formatDate(j.toArrivalDate)}  Arrival Time : ${formatTime(
      j.toArrivalDate
    )}`,
  ];

  const mode = (j.mode || "").toLowerCase();
  if (mode === "train") {
    lines.push(
      [
        j.trainNumber ? `Train Number : ${j.trainNumber}` : null,
        j.trainName ? `Train Name : ${j.trainName}` : null,
        j.pnrNumber ? `Train PNR : ${j.pnrNumber}` : null,
      ]
        .filter(Boolean)
        .join(" , ")
    );
  } else if (mode === "flight") {
    lines.push(
      [
        j.flightNumber ? `Flight Number : ${j.flightNumber}` : null,
        j.airlineName ? `Airline : ${j.airlineName}` : null,
        j.pnrNumber ? `Airline PNR : ${j.pnrNumber}` : null,
      ]
        .filter(Boolean)
        .join(" , ")
    );
  } else if (mode === "bus" && j.busName) {
    lines.push(`Bus : ${j.busName}`);
  }

  return lines.filter(Boolean).join("\n");
};

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

/**
 * Package Summary PDF (TourPro package_quotation_print style).
 */
const generatePackageSummary = async (data, filePath) => {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) fs.mkdirSync(dirname, { recursive: true });

  const {
    agencyDetails = {},
    client = {},
    tourTitle,
    bookingType,
    journeyDate,
    bookingDetails = [],
    hotels = [],
    vehicles = [],
    journeys = [],
    services = [],
    costing = {},
  } = data;

  const company = agencyDetails;
  const companyAddress = (company.addressLines || []).join("\n");
  const content = [];

  // Agency header
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

  // Intro
  content.push({
    text: "R/ Sir ,",
    style: "boldText",
    margin: [0, 0, 0, 6],
  });
  content.push({
    text: "As per discussion, the itinerary and costing for your tour is as follows :",
    style: "boldText",
    margin: [0, 0, 0, 10],
  });

  // Info table
  content.push({
    table: {
      widths: ["30%", "*"],
      body: [
        [
          { text: "Tour Title", style: "boldText" },
          cell(tourTitle || ""),
        ],
        [
          { text: "Guest Name", style: "boldText" },
          cell(client.clientName || ""),
        ],
        [
          { text: "Total No. of Pax", style: "boldText" },
          cell(buildPaxText(data)),
        ],
        [
          { text: "Tour Status", style: "boldText" },
          cell(bookingType || ""),
        ],
        [
          { text: "Journey Start Date", style: "boldText" },
          cell(formatDate(journeyDate)),
        ],
      ],
    },
    layout: tableLayout,
    margin: [0, 0, 0, 8],
  });

  // Itinerary
  content.push(sectionTitle("Itinerary is as follows :-"));
  const itineraryRows = [
    [
      headerCell("Date"),
      headerCell("Programme"),
      headerCell("Night Halt"),
    ],
    ...bookingDetails.map((d) => [
      cell(formatDate(d.date)),
      cell(d.description || ""),
      cell(d.cityName || ""),
    ]),
  ];
  if (bookingDetails.length === 0) {
    itineraryRows.push([
      { text: "No itinerary details", colSpan: 3, style: "tableCell", alignment: "center" },
      {},
      {},
    ]);
  }
  content.push({
    table: {
      headerRows: 1,
      widths: ["18%", "*", "22%"],
      body: itineraryRows,
    },
    layout: tableLayout,
  });

  // Hotels
  if (hotels.length > 0) {
    content.push(sectionTitle("Hotels"));
    content.push({
      table: {
        headerRows: 1,
        widths: ["14%", "14%", "*", "12%", "10%", "12%"],
        body: [
          [
            headerCell("Check In"),
            headerCell("Check Out"),
            headerCell("Place / Hotel"),
            headerCell("No Of Rooms"),
            headerCell("Plan"),
            headerCell("No Of Nights"),
          ],
          ...hotels.map((h) => {
            const place = [h.cityName, h.hotelName].filter(Boolean).join(" - ");
            return [
              cell(formatDate(h.checkInDate)),
              cell(formatDate(h.checkOutDate)),
              cell(place),
              cell(h.rooms != null ? h.rooms : "", { alignment: "center" }),
              cell(h.plan || "", { alignment: "center" }),
              cell(h.nights != null ? h.nights : "", { alignment: "center" }),
            ];
          }),
        ],
      },
      layout: tableLayout,
    });
  }

  // Vehicles
  if (vehicles.length > 0) {
    content.push(sectionTitle("Vehicle"));
    content.push({
      table: {
        headerRows: 1,
        widths: ["14%", "14%", "*", "12%"],
        body: [
          [
            headerCell("From"),
            headerCell("To"),
            headerCell("Detail"),
            headerCell("No Of Days"),
          ],
          ...vehicles.map((v) => [
            cell(formatDate(v.fromDate)),
            cell(formatDate(v.toDate)),
            cell(v.detail || v.summaryNote || v.billDescription || ""),
            cell(v.days != null ? v.days : "", { alignment: "center" }),
          ]),
        ],
      },
      layout: tableLayout,
    });
  }

  // Costing
  content.push(sectionTitle("Costing for your tour is as follows :-"));

  const srLabels = ["A", "B", "C", "D", "E", "F", "G", "H"];
  let srIndex = 0;
  const srUsed = [];

  // (A) Railway / Flights
  if (journeys.length > 0) {
    const letter = srLabels[srIndex++];
    srUsed.push(letter);
    content.push(sectionTitle(`(${letter}) Railway / Flights`));

    let totalJourneyCost = 0;
    const journeyRows = journeys.map((j) => {
      const cost = journeyCost(j);
      totalJourneyCost += cost;
      return [
        cell(formatDate(j.fromDepartureDate)),
        cell(buildJourneyDetails(j)),
        cellRight(money(cost)),
      ];
    });

    content.push({
      table: {
        headerRows: 1,
        widths: ["18%", "*", "18%"],
        body: [
          [
            headerCell("Date"),
            headerCell("Details"),
            headerCell("Cost (INR)"),
          ],
          ...journeyRows,
          [
            { text: "Total Journey Cost", colSpan: 2, style: "boldText", alignment: "right" },
            {},
            cellRight(money(totalJourneyCost), { bold: true }),
          ],
        ],
      },
      layout: tableLayout,
    });
  }

  // (B) Package Cost
  {
    const letter = srLabels[srIndex++];
    srUsed.push(letter);
    const packageAmount = isNonZero(costing.serviceChargeOnCost)
      ? num(costing.serviceChargeOnCost)
      : num(costing.packageCost);

    content.push(sectionTitle(`(${letter}) Package Cost`));
    content.push({
      table: {
        widths: ["*", "20%"],
        body: [
          [
            {
              text: "Package Amount (Includes Hotel and Vehicle Booking Charges)",
              style: "tableCell",
              alignment: "center",
            },
            cellRight(money(packageAmount), { bold: true }),
          ],
        ],
      },
      layout: tableLayout,
    });
  }

  // (C) Tour Service Cost
  if (services.length > 0) {
    const letter = srLabels[srIndex++];
    srUsed.push(letter);
    content.push(sectionTitle(`(${letter}) Tour Service Cost`));

    let totalServiceCost = 0;
    const serviceRows = services.map((s) => {
      const cost = s.cost != null ? num(s.cost) : num(s.inputCost);
      totalServiceCost += cost;
      return [
        cell(s.serviceName || "", { alignment: "center" }),
        cell(s.description || ""),
        cellRight(money(cost)),
      ];
    });

    content.push({
      table: {
        headerRows: 1,
        widths: ["20%", "*", "18%"],
        body: [
          [
            headerCell("Services"),
            headerCell("Detail"),
            headerCell("Cost (INR)"),
          ],
          ...serviceRows,
          [
            {
              text: "Total Tour Service Cost",
              colSpan: 2,
              style: "boldText",
              alignment: "right",
            },
            {},
            cellRight(money(totalServiceCost), { bold: true }),
          ],
        ],
      },
      layout: tableLayout,
    });
  }

  // (D) Professional Fees
  if (isNonZero(costing.serviceChargeOnPackage)) {
    const letter = srLabels[srIndex++];
    srUsed.push(letter);
    content.push(sectionTitle(`(${letter}) Professional Fees`));
    content.push({
      table: {
        widths: ["*", "20%"],
        body: [
          [
            {
              text: "Professional Fees",
              style: "tableCell",
              alignment: "center",
            },
            cellRight(money(costing.serviceChargeOnPackage), { bold: true }),
          ],
        ],
      },
      layout: tableLayout,
    });
  }

  // Discount (skip Service Tax)
  if (isNonZero(costing.discount)) {
    const letter = srLabels[srIndex++];
    srUsed.push(letter);
    content.push(sectionTitle(`(${letter}) Discount`));
    content.push({
      table: {
        widths: ["*", "20%"],
        body: [
          [
            {
              text: "Discount",
              style: "tableCell",
              alignment: "center",
            },
            cellRight(money(costing.discount), { bold: true }),
          ],
        ],
      },
      layout: tableLayout,
    });
  }

  // Total Chargeable Amount
  {
    const letter = srLabels[srIndex++];
    content.push(sectionTitle(`(${letter}) Total Chargeable Amount`));
    content.push({
      table: {
        widths: ["25%", "*", "20%"],
        body: [
          [
            {
              text: srUsed.join(" + "),
              style: "boldText",
              alignment: "center",
            },
            {
              text: "",
              style: "tableCell",
            },
            cellRight(money(costing.payableAmount), { bold: true }),
          ],
          [
            {
              text: `Amount In Words : ${costing.amountInWords || ""}`,
              colSpan: 3,
              style: "boldText",
            },
            {},
            {},
          ],
        ],
      },
      layout: tableLayout,
    });
  }

  // Closing
  const contactName =
    company.contactPersonName || company.contactName || company.name || "";
  const contactPhone = company.phone || company.contactPersonPhone || "";
  const contactEmail = company.email || company.contactPersonEmail || "";

  content.push({
    stack: [
      {
        text: "Kindly feel free to contact me for further clarifications.",
        style: "normalText",
        margin: [0, 16, 0, 8],
      },
      { text: "Warm Regards ,", style: "normalText", margin: [0, 0, 0, 20] },
      contactName
        ? { text: contactName, style: "boldText", margin: [0, 0, 0, 2] }
        : {},
      contactPhone
        ? { text: contactPhone, style: "smallText", margin: [0, 0, 0, 1] }
        : {},
      contactEmail
        ? { text: contactEmail, style: "smallText", margin: [0, 0, 0, 1] }
        : {},
    ],
  });

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [40, 50, 40, 50],
    content,
    styles: {
      companyName: { fontSize: 14, bold: true },
      sectionTitle: { fontSize: 10, bold: true },
      boldText: { fontSize: 10, bold: true },
      normalText: { fontSize: 9 },
      smallText: { fontSize: 7 },
      smallCenter: { fontSize: 8, alignment: "center" },
      tableHeader: {
        fontSize: 9,
        bold: true,
        fillColor: "#EEEEEE",
        alignment: "center",
      },
      tableCell: { fontSize: 9 },
      tableCellRight: { fontSize: 9, alignment: "right" },
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

module.exports = generatePackageSummary;
