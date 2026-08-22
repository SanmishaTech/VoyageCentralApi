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

const hotelCost = (h) => {
  if (h.totalCost != null && h.totalCost !== "") return num(h.totalCost);
  return num(h.inputCost) + num(h.serviceCharge);
};

const vehicleCost = (v) => {
  if (v.totalCost != null && v.totalCost !== "") return num(v.totalCost);
  return num(v.inputCost) + num(v.serviceCharge);
};

const serviceCost = (s) => {
  if (s.cost != null && s.cost !== "") return num(s.cost);
  if (s.totalCost != null && s.totalCost !== "") return num(s.totalCost);
  return num(s.inputCost);
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

const resolveServiceCharge = (costing) => {
  if (costing.packageServiceCharge != null && costing.packageServiceCharge !== "") {
    return num(costing.packageServiceCharge);
  }
  if (costing.totalServiceCharge != null && costing.totalServiceCharge !== "") {
    return num(costing.totalServiceCharge);
  }
  return 0;
};

/**
 * Booking Quotation PDF (TourPro quotation_print style).
 */
const generateBookingQuotation = async (data, filePath) => {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) fs.mkdirSync(dirname, { recursive: true });

  const {
    agencyDetails = {},
    client = {},
    tourTitle,
    bookingType,
    journeyDate,
    bookingDetails = [],
    journeys = [],
    hotels = [],
    vehicles = [],
    services = [],
    costing = {},
  } = data;

  const company = agencyDetails;
  const companyAddress = (company.addressLines || []).join("\n");
  const content = [];
  const cur = "Rs. ";

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
        [{ text: "Tour Title", style: "boldText" }, cell(tourTitle || "")],
        [
          { text: "Guest Name", style: "boldText" },
          cell(client.clientName || ""),
        ],
        [
          { text: "Total No. of Pax", style: "boldText" },
          cell(buildPaxText(data)),
        ],
        [{ text: "Tour Status", style: "boldText" }, cell(bookingType || "")],
        [
          { text: "Journey Start Date", style: "boldText" },
          cell(formatDate(journeyDate)),
        ],
      ],
    },
    layout: tableLayout,
    margin: [0, 0, 0, 8],
  });

  // Itinerary (no pickup time)
  content.push(sectionTitle("Itinerary is as follows :-"));
  const itineraryRows = [
    [headerCell("Date"), headerCell("Programme"), headerCell("Night Halt")],
    ...bookingDetails.map((d) => [
      cell(formatDate(d.date)),
      cell(d.description || ""),
      cell(d.cityName || ""),
    ]),
  ];
  if (bookingDetails.length === 0) {
    itineraryRows.push([
      {
        text: "No itinerary details",
        colSpan: 3,
        style: "tableCell",
        alignment: "center",
      },
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

  // Costing
  content.push(sectionTitle("Costing for your tour is as follows :-"));

  const srLabels = ["A", "B", "C", "D", "E", "F", "G", "H"];
  let srIndex = 0;
  const srUsed = [];
  const amountParts = [];

  let totalJourneyCost = 0;
  let totalHotelCost = 0;
  let totalVehicleCost = 0;
  let totalServiceAmt = 0;

  // (A) Railways / Flights
  if (journeys.length > 0) {
    const letter = srLabels[srIndex++];
    srUsed.push(letter);
    content.push(sectionTitle(`(${letter}) Railways / Flights`));

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
            {
              text: "Total Journey Cost",
              colSpan: 2,
              style: "boldText",
              alignment: "right",
            },
            {},
            cellRight(`${cur} ${money(totalJourneyCost)}`, { bold: true }),
          ],
        ],
      },
      layout: tableLayout,
    });
    if (totalJourneyCost !== 0) amountParts.push(money(totalJourneyCost));
  }

  // (B) Hotels
  if (hotels.length > 0) {
    const letter = srLabels[srIndex++];
    srUsed.push(letter);
    content.push(sectionTitle(`(${letter}) Hotels`));

    const hotelRows = hotels.map((h) => {
      const cost = hotelCost(h);
      totalHotelCost += cost;
      const place = [h.cityName, h.hotelName].filter(Boolean).join(" - ");
      return [
        cell(formatDate(h.checkInDate)),
        cell(formatDate(h.checkOutDate)),
        cell(place),
        cell(h.rooms != null ? h.rooms : "", { alignment: "center" }),
        cell(h.plan || "", { alignment: "center" }),
        cell(h.nights != null ? h.nights : "", { alignment: "center" }),
        cellRight(money(cost)),
      ];
    });

    content.push({
      table: {
        headerRows: 1,
        widths: ["12%", "12%", "*", "10%", "8%", "10%", "14%"],
        body: [
          [
            headerCell("Check In"),
            headerCell("Check Out"),
            headerCell("Place / Hotel"),
            headerCell("No Of Rooms"),
            headerCell("Plan"),
            headerCell("No Of Nights"),
            headerCell("Total"),
          ],
          ...hotelRows,
          [
            {
              text: "Total Hotel Cost",
              colSpan: 6,
              style: "boldText",
              alignment: "right",
            },
            {},
            {},
            {},
            {},
            {},
            cellRight(`${cur} ${money(totalHotelCost)}`, { bold: true }),
          ],
        ],
      },
      layout: tableLayout,
    });
    if (totalHotelCost !== 0) amountParts.push(money(totalHotelCost));
  }

  // (C) Vehicle
  if (vehicles.length > 0) {
    const letter = srLabels[srIndex++];
    srUsed.push(letter);
    content.push(sectionTitle(`(${letter}) Vehicle`));

    const vehicleRows = vehicles.map((v) => {
      const cost = vehicleCost(v);
      totalVehicleCost += cost;
      return [
        cell(formatDate(v.fromDate)),
        cell(formatDate(v.toDate)),
        cell(v.detail || v.summaryNote || v.billDescription || ""),
        cell(v.days != null ? v.days : "", { alignment: "center" }),
        cellRight(money(cost)),
      ];
    });

    content.push({
      table: {
        headerRows: 1,
        widths: ["14%", "14%", "*", "12%", "16%"],
        body: [
          [
            headerCell("From"),
            headerCell("To"),
            headerCell("Detail"),
            headerCell("No Of Days"),
            headerCell("Total (INR)"),
          ],
          ...vehicleRows,
          [
            {
              text: "Total Vehicle Cost",
              colSpan: 4,
              style: "boldText",
              alignment: "right",
            },
            {},
            {},
            {},
            cellRight(`${cur} ${money(totalVehicleCost)}`, { bold: true }),
          ],
        ],
      },
      layout: tableLayout,
    });
    if (totalVehicleCost !== 0) amountParts.push(money(totalVehicleCost));
  }

  // (D) Tour Service Cost
  if (services.length > 0) {
    const letter = srLabels[srIndex++];
    srUsed.push(letter);
    content.push(sectionTitle(`(${letter}) Tour Service Cost`));

    const serviceRows = services.map((s) => {
      const cost = serviceCost(s);
      totalServiceAmt += cost;
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
            cellRight(`${cur} ${money(totalServiceAmt)}`, { bold: true }),
          ],
        ],
      },
      layout: tableLayout,
    });
    if (totalServiceAmt !== 0) amountParts.push(money(totalServiceAmt));
  }

  // Service Charge
  const serviceChargeAmt = resolveServiceCharge(costing);
  if (isNonZero(serviceChargeAmt)) {
    const letter = srLabels[srIndex++];
    srUsed.push(letter);
    content.push(sectionTitle(`(${letter}) Service Charge`));
    content.push({
      table: {
        widths: ["*", "20%"],
        body: [
          [
            {
              text: "Service Charge",
              style: "tableCell",
              alignment: "center",
            },
            cellRight(`${cur} ${money(serviceChargeAmt)}`, { bold: true }),
          ],
        ],
      },
      layout: tableLayout,
    });
    amountParts.push(money(serviceChargeAmt));
  }

  // GST (Service Tax removed; show only when gstAmount provided and != 0)
  const gstAmount = num(costing.gstAmount);
  if (isNonZero(gstAmount)) {
    const letter = srLabels[srIndex++];
    srUsed.push(letter);
    const gstLabel = costing.gstPercent
      ? `GST @ ${costing.gstPercent}%`
      : "GST";
    content.push(sectionTitle(`(${letter}) GST`));
    content.push({
      table: {
        widths: ["*", "20%"],
        body: [
          [
            {
              text: gstLabel,
              style: "tableCell",
              alignment: "center",
            },
            cellRight(`${cur} ${money(gstAmount)}`, { bold: true }),
          ],
        ],
      },
      layout: tableLayout,
    });
    amountParts.push(money(gstAmount));
  }

  // Discount
  const discount = num(costing.discount);
  if (isNonZero(discount)) {
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
            cellRight(`${cur} ${money(discount)}`, { bold: true }),
          ],
        ],
      },
      layout: tableLayout,
    });
  }

  // Final Total
  {
    const letter = srLabels[srIndex++];
    const payable =
      costing.payableAmount != null && costing.payableAmount !== ""
        ? num(costing.payableAmount)
        : totalJourneyCost +
          totalHotelCost +
          totalVehicleCost +
          totalServiceAmt +
          serviceChargeAmt +
          gstAmount -
          discount;

    let formulaText = amountParts.join(" + ");
    if (isNonZero(discount)) {
      formulaText = formulaText
        ? `${formulaText} - ${money(discount)}`
        : `- ${money(discount)}`;
    }

    content.push(sectionTitle(`(${letter}) Final Total`));
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
              text: formulaText,
              style: "tableCell",
              alignment: "center",
            },
            cellRight(`${cur} ${money(payable)}`, { bold: true }),
          ],
          costing.amountInWords
            ? [
                {
                  text: `Amount In Words : ${costing.amountInWords}`,
                  colSpan: 3,
                  style: "boldText",
                },
                {},
                {},
              ]
            : null,
        ].filter(Boolean),
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
      company.name
        ? { text: company.name, style: "boldText", margin: [0, 2, 0, 0] }
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

module.exports = generateBookingQuotation;
