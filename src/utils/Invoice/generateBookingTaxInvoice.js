const PdfPrinter = require("pdfmake");
const fs = require("fs");
const path = require("path");
const { numberToWords } = require("../numberToWords");

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

const money = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const toNum = (n) => Number(n || 0);

const wordsFor = (n) => {
  const amount = toNum(n);
  try {
    return numberToWords(amount);
  } catch (_) {
    return "";
  }
};

const tableLayout = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  paddingLeft: () => 6,
  paddingRight: () => 6,
  paddingTop: () => 4,
  paddingBottom: () => 4,
};

const grayCell = (text, opts = {}) => ({
  text,
  bold: true,
  fontSize: 9,
  fillColor: "#D3D3D3",
  ...opts,
});

const buildHeader = (company) => {
  const addressText = (company.addressLines || []).filter(Boolean).join("\n");
  const contactLine = [
    company.phone ? `Mobile Number :-   ${company.phone}` : "",
    company.email ? `Email :-   ${company.email}` : "",
  ]
    .filter(Boolean)
    .join("     ");

  return {
    stack: [
      {
        columns: [
          company.logoPath && fs.existsSync(company.logoPath)
            ? { image: company.logoPath, width: 70, margin: [0, 0, 8, 0] }
            : { text: "", width: 70 },
          {
            width: "*",
            alignment: "center",
            stack: [
              { text: company.name || "", style: "companyName", alignment: "center" },
              addressText
                ? { text: addressText, style: "smallCenter", margin: [0, 2, 0, 0] }
                : {},
              contactLine
                ? { text: contactLine, style: "smallCenter", margin: [0, 2, 0, 0] }
                : {},
            ],
          },
          { text: "", width: 70 },
        ],
      },
      {
        canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }],
        margin: [0, 8, 0, 8],
      },
      {
        text: "Tax Invoice",
        style: "title",
        alignment: "center",
        margin: [0, 0, 0, 10],
      },
    ],
  };
};

const buildPartyTable = (client, company, invoiceNumber, invoiceDate) => {
  const clientAddressParts = [
    ...(client.addressLines || []),
    [client.city, client.pincode].filter(Boolean).join(" "),
  ].filter(Boolean);

  let mobileLine = "";
  if (client.mobile2) {
    mobileLine = `Mobile : ${client.mobile || ""} / ${client.mobile2}`;
  } else if (client.mobile) {
    mobileLine = `Mobile : ${client.mobile}`;
  }

  const leftStack = [
    { text: `Invoice No : ${invoiceNumber || ""}`, bold: true, fontSize: 9 },
    { text: `Invoice Date : ${formatDate(invoiceDate)}`, bold: true, fontSize: 9 },
    { text: `Client : ${client.clientName || ""}`, bold: true, fontSize: 9 },
    ...clientAddressParts.map((line) => ({ text: line, fontSize: 9 })),
    mobileLine ? { text: mobileLine, fontSize: 9 } : null,
    client.email ? { text: `Email : ${client.email}`, fontSize: 9 } : null,
    {
      text: `GST IN : ${client.gstin || "Not Applicable"}`,
      fontSize: 9,
    },
  ].filter(Boolean);

  const agencyAddress = (company.addressLines || []).filter(Boolean);
  const cityDistLine = [
    company.city ? `City / Dist : ${company.city}` : "",
    company.pincode || "",
  ]
    .filter(Boolean)
    .join(" , ");

  const rightStack = [
    { text: company.name || "", bold: true, fontSize: 9 },
    ...agencyAddress.map((line) => ({ text: line, fontSize: 9 })),
    cityDistLine ? { text: cityDistLine, fontSize: 9 } : null,
    {
      text: `State : ${company.stateName || ""}          Code : ${
        company.stateCode || ""
      }`,
      fontSize: 9,
    },
    {
      text: `GST IN / UIN : ${company.gstinUin || ""}`,
      fontSize: 9,
    },
    company.pan != null && company.pan !== ""
      ? { text: `PAN No : ${company.pan}`, fontSize: 9 }
      : { text: `PAN No : `, fontSize: 9 },
  ].filter(Boolean);

  return {
    table: {
      widths: ["*", "*"],
      body: [
        [
          { stack: leftStack, border: [true, true, true, true] },
          { stack: rightStack, border: [true, true, true, true] },
        ],
      ],
    },
    layout: tableLayout,
    margin: [0, 0, 0, 10],
  };
};

const journeyDetailLine = (j, sr) => {
  const parts = [
    `${sr}) ${j.fromPlace || ""} To ${j.toPlace || ""} By ${j.mode || ""}`,
  ];
  const mode = (j.mode || "").toLowerCase();
  if (mode === "flight") {
    const flightBits = [j.airlineName, j.flightNumber].filter(Boolean).join(" - ");
    if (flightBits) parts.push(`- ${flightBits}`);
  } else if (mode === "train" && j.trainNumber) {
    parts.push(`- ${j.trainNumber}`);
  } else if (mode === "bus" && j.busName) {
    parts.push(`- ${j.busName}`);
  }
  if (j.billDescription) parts.push(`- ${j.billDescription}`);
  return parts.join(" ");
};

const buildJourneyBody = (journeys, isPackage) => {
  const firstMode = journeys[0]?.mode || "";
  const descLines = [
    { text: `Journey Booking For ${firstMode}`, bold: true, fontSize: 9 },
    ...journeys.map((j, i) => ({
      text: journeyDetailLine(j, i + 1),
      fontSize: 9,
      margin: [0, 2, 0, 0],
    })),
  ];
  const amountLines = journeys.map((j) => ({
    text: money(j.inputCost != null ? j.inputCost : j.amount),
    fontSize: 9,
    alignment: "right",
    margin: [0, 2, 0, 0],
  }));

  const journeyTotal = journeys.reduce((sum, j) => {
    if (isPackage) {
      return sum + toNum(j.totalCost != null ? j.totalCost : j.inputCost);
    }
    return sum + toNum(j.inputCost != null ? j.inputCost : j.amount);
  }, 0);

  return {
    body: [
      [
        { stack: descLines },
        { stack: [{ text: " ", fontSize: 9 }, ...amountLines], alignment: "right" },
      ],
      [
        grayCell("Total Journey Amount Chargeable"),
        grayCell(money(journeyTotal), { alignment: "right" }),
      ],
      [
        {
          text: `Amount In Words : ${wordsFor(journeyTotal)}`,
          bold: true,
          fontSize: 9,
          fillColor: "#D3D3D3",
          colSpan: 2,
        },
        {},
      ],
    ],
    journeyTotal,
  };
};

const buildPackageIncludesLabel = (hotels, vehicles, services) => {
  const labelParts = [];
  if (hotels.length) labelParts.push("Hotel");
  if (vehicles.length) labelParts.push("+ Vehicle");
  if (services.length) labelParts.push("+ Other Services");
  return `Package Details (Package includes ${labelParts.join(" ")} charges)`;
};

const hotelLine = (h, sr) => {
  let line = `${sr}) ${h.hotelName || ""}`;
  if (h.cityName) line += ` - ${h.cityName}`;
  if (h.rooms != null && h.rooms !== "") line += ` - ${h.rooms} Room(s)`;
  if (h.nights != null && h.nights !== "") line += ` For ${h.nights} Night(s)`;
  if (h.billDescription) line += ` - ${h.billDescription}`;
  return line;
};

const vehicleLine = (v, sr) =>
  [
    `${sr})`,
    v.numberOfVehicles != null ? String(v.numberOfVehicles) : "",
    v.summaryNote || "",
    v.vehicleName || "",
    v.cityName ? `- ${v.cityName}` : "",
  ]
    .filter(Boolean)
    .join(" ");

const buildPackageSectionRows = (data) => {
  const hotels = data.hotels || [];
  const vehicles = data.vehicles || [];
  const services = data.services || [];
  const costing = data.costing || {};
  const serviceChargeOnCost = toNum(costing.serviceChargeOnCost);
  const showLineAmounts = serviceChargeOnCost === 0;

  const descStack = [
    {
      text: buildPackageIncludesLabel(hotels, vehicles, services),
      bold: true,
      fontSize: 9,
    },
  ];

  if (hotels.length) {
    descStack.push({
      text: "Hotel Booking",
      bold: true,
      fontSize: 9,
      margin: [0, 6, 0, 0],
    });
    hotels.forEach((h, i) => {
      descStack.push({
        text: hotelLine(h, i + 1),
        fontSize: 9,
        margin: [0, 2, 0, 0],
      });
    });
  }

  if (vehicles.length) {
    descStack.push({
      text: "Vehicle Booking",
      bold: true,
      fontSize: 9,
      margin: [0, 8, 0, 0],
    });
    vehicles.forEach((v, i) => {
      descStack.push({
        text: vehicleLine(v, i + 1),
        fontSize: 9,
        margin: [0, 2, 0, 0],
      });
    });
  }

  if (services.length) {
    descStack.push({
      text: "Other Services",
      bold: true,
      fontSize: 9,
      margin: [0, 8, 0, 0],
    });
    services.forEach((s, i) => {
      descStack.push({
        text: `${i + 1}) ${s.description || ""}`,
        fontSize: 9,
        margin: [0, 2, 0, 0],
      });
    });
  }

  descStack.push({
    canvas: [{ type: "line", x1: 0, y1: 0, x2: 320, y2: 0, lineWidth: 0.5 }],
    margin: [0, 8, 0, 4],
  });
  descStack.push({ text: "Total Package Amount", bold: true, fontSize: 9 });

  const amountStack = [{ text: " ", fontSize: 9 }];

  if (showLineAmounts) {
    hotels.forEach((h) => {
      amountStack.push({
        text: money(h.inputCost),
        fontSize: 9,
        alignment: "right",
        margin: [0, 2, 0, 0],
      });
    });
    if (hotels.length) amountStack.push({ text: " ", fontSize: 9 });
    vehicles.forEach((v) => {
      amountStack.push({
        text: money(v.inputCost),
        fontSize: 9,
        alignment: "right",
        margin: [0, 2, 0, 0],
      });
    });
    if (vehicles.length) amountStack.push({ text: " ", fontSize: 9 });
    services.forEach((s) => {
      amountStack.push({
        text: money(s.inputCost),
        fontSize: 9,
        alignment: "right",
        margin: [0, 2, 0, 0],
      });
    });
  } else {
    hotels.forEach(() => amountStack.push({ text: " ", fontSize: 9 }));
    vehicles.forEach(() => amountStack.push({ text: " ", fontSize: 9 }));
    amountStack.push({
      text: money(serviceChargeOnCost),
      bold: true,
      fontSize: 9,
      alignment: "right",
      margin: [0, 4, 0, 0],
    });
    services.forEach((s) => {
      amountStack.push({
        text: money(s.inputCost),
        fontSize: 9,
        alignment: "right",
        margin: [0, 2, 0, 0],
      });
    });
  }

  amountStack.push({
    canvas: [{ type: "line", x1: 0, y1: 0, x2: 100, y2: 0, lineWidth: 0.5 }],
    margin: [0, 8, 0, 4],
    alignment: "right",
  });
  amountStack.push({
    text: money(costing.packageCost),
    bold: true,
    fontSize: 9,
    alignment: "right",
  });

  const rows = [
    [
      { stack: descStack },
      { stack: amountStack, alignment: "right" },
    ],
  ];

  if (toNum(costing.serviceChargeOnPackage) !== 0) {
    const feeLabel = costing.billDescription
      ? `Professional Fees\n${costing.billDescription}`
      : "Professional Fees";
    rows.push([
      { text: feeLabel, bold: true, fontSize: 9 },
      {
        text: money(costing.serviceChargeOnPackage),
        bold: true,
        fontSize: 9,
        alignment: "right",
      },
    ]);
  }

  if (toNum(costing.discount) !== 0) {
    rows.push([
      { text: "Discount", fontSize: 9 },
      { text: money(costing.discount), fontSize: 9, alignment: "right" },
    ]);
  }

  if (toNum(costing.gstAmount) !== 0 || toNum(costing.gstPercent) !== 0) {
    rows.push([
      {
        text: `GST On ${costing.gstOn || ""}${
          costing.gstPercent != null ? ` (${toNum(costing.gstPercent)}%)` : ""
        }`,
        bold: true,
        fontSize: 9,
      },
      {
        text: money(costing.gstAmount),
        bold: true,
        fontSize: 9,
        alignment: "right",
      },
    ]);
  }

  // Journey billed on its own page when present → package page uses totalPackageCost
  const chargeable = toNum(
    (data.journeys || []).length
      ? costing.totalPackageCost != null
        ? costing.totalPackageCost
        : costing.payableAmount
      : costing.payableAmount != null
        ? costing.payableAmount
        : costing.totalPackageCost
  );

  rows.push([
    grayCell("Total Amount Chargeable"),
    grayCell(money(chargeable), { alignment: "right" }),
  ]);
  rows.push([
    {
      text: `Amount In Words : ${wordsFor(chargeable)}`,
      bold: true,
      fontSize: 9,
      fillColor: "#D3D3D3",
      colSpan: 2,
    },
    {},
  ]);

  return rows;
};

const buildNonPackageSectionRows = (data) => {
  const hotels = data.hotels || [];
  const vehicles = data.vehicles || [];
  const services = data.services || [];
  const costing = data.costing || {};
  const rows = [];

  if (hotels.length) {
    const descStack = [
      { text: "Hotel Booking", bold: true, fontSize: 9 },
      ...hotels.map((h, i) => ({
        text: hotelLine(h, i + 1),
        fontSize: 9,
        margin: [0, 2, 0, 0],
      })),
    ];
    const amountStack = [
      { text: " ", fontSize: 9 },
      ...hotels.map((h) => ({
        text: money(h.inputCost),
        bold: true,
        fontSize: 9,
        alignment: "right",
        margin: [0, 2, 0, 0],
      })),
    ];
    rows.push([
      { stack: descStack },
      { stack: amountStack, alignment: "right" },
    ]);
  }

  if (vehicles.length) {
    const descStack = [
      { text: "Vehicle Booking", bold: true, fontSize: 9 },
      ...vehicles.map((v, i) => ({
        text: vehicleLine(v, i + 1),
        fontSize: 9,
        margin: [0, 2, 0, 0],
      })),
    ];
    const amountStack = [
      { text: " ", fontSize: 9 },
      ...vehicles.map((v) => ({
        text: money(v.inputCost),
        bold: true,
        fontSize: 9,
        alignment: "right",
        margin: [0, 2, 0, 0],
      })),
    ];
    rows.push([
      { stack: descStack },
      { stack: amountStack, alignment: "right" },
    ]);
  }

  if (services.length) {
    const descStack = [
      { text: "Other Services", bold: true, fontSize: 9 },
      ...services.map((s, i) => ({
        text: `${i + 1}) ${s.description || ""}`,
        fontSize: 9,
        margin: [0, 2, 0, 0],
      })),
    ];
    const amountStack = [
      { text: " ", fontSize: 9 },
      ...services.map((s) => ({
        text: money(s.inputCost),
        bold: true,
        fontSize: 9,
        alignment: "right",
        margin: [0, 2, 0, 0],
      })),
    ];
    rows.push([
      { stack: descStack },
      { stack: amountStack, alignment: "right" },
    ]);
  }

  const profFee = toNum(costing.packageServiceCharge) || toNum(costing.serviceChargeOnPackage);
  if (profFee !== 0) {
    const feeLabel = costing.billDescription
      ? `Professional Fees\n${costing.billDescription}`
      : "Professional Fees";
    rows.push([
      { text: feeLabel, bold: true, fontSize: 9 },
      { text: money(profFee), bold: true, fontSize: 9, alignment: "right" },
    ]);
  }

  if (toNum(costing.discount) !== 0) {
    rows.push([
      { text: "Discount Amount", fontSize: 9 },
      {
        text: money(costing.discount),
        bold: true,
        fontSize: 9,
        alignment: "right",
      },
    ]);
  }

  if (toNum(costing.gstAmount) !== 0 || toNum(costing.gstPercent) !== 0) {
    rows.push([
      {
        text: `GST On ${costing.gstOn || ""}${
          costing.gstPercent != null ? ` (${toNum(costing.gstPercent)}%)` : ""
        }`,
        bold: true,
        fontSize: 9,
      },
      {
        text: money(costing.gstAmount),
        bold: true,
        fontSize: 9,
        alignment: "right",
      },
    ]);
  }

  const chargeable = toNum(
    (data.journeys || []).length
      ? costing.totalPackageCost != null
        ? costing.totalPackageCost
        : costing.payableAmount
      : costing.payableAmount != null
        ? costing.payableAmount
        : costing.totalPackageCost
  );

  rows.push([
    grayCell("Total Amount Chargeable"),
    grayCell(money(chargeable), { alignment: "right" }),
  ]);
  rows.push([
    {
      text: `Amount In Words : ${wordsFor(chargeable)}`,
      bold: true,
      fontSize: 9,
      fillColor: "#D3D3D3",
      colSpan: 2,
    },
    {},
  ]);

  return rows;
};

const servicesTableHeader = [
  {
    text: "Description of services",
    bold: true,
    fontSize: 9,
    fillColor: "#D3D3D3",
  },
  {
    text: "Total (INR)",
    bold: true,
    fontSize: 9,
    fillColor: "#D3D3D3",
    alignment: "right",
  },
];

const buildFooter = (company) => {
  const bank = company.bank;
  const bankStack = [{ text: "Bank Details", bold: true, fontSize: 9 }];
  if (bank && (bank.bankName || bank.accountNo || bank.ifsc)) {
    const bankLine = [bank.bankName, bank.branch].filter(Boolean).join(", ");
    if (bankLine) bankStack.push({ text: bankLine, fontSize: 9 });
    if (bank.accountName) {
      bankStack.push({ text: `A/c Name : ${bank.accountName}`, fontSize: 9 });
    }
    if (bank.accountNo) {
      bankStack.push({ text: `A/c No : ${bank.accountNo}`, fontSize: 9 });
    }
    if (bank.ifsc) {
      bankStack.push({ text: `IFSC Code : ${bank.ifsc}`, fontSize: 9 });
    }
  } else {
    bankStack.push({ text: "—", fontSize: 9 });
  }

  bankStack.push({ text: " ", fontSize: 9, margin: [0, 8, 0, 0] });
  bankStack.push({
    text: "Declaration of Services",
    bold: true,
    fontSize: 9,
  });
  bankStack.push({
    text: "We declare that this invoice shows the actual price of the services described and that all particulars are true and correct.",
    fontSize: 9,
  });

  const jurisdiction = (
    company.jurisdiction ||
    company.city ||
    "THE LOCAL"
  ).toUpperCase();

  return {
    stack: [
      {
        table: {
          widths: ["*", "*"],
          body: [
            [
              { stack: bankStack },
              {
                stack: [
                  { text: " ", fontSize: 9, margin: [0, 24, 0, 0] },
                  {
                    text: `For ${company.name || ""}`,
                    fontSize: 9,
                    alignment: "right",
                  },
                  { text: " ", fontSize: 9, margin: [0, 28, 0, 0] },
                  {
                    text: "Authorised Signatory",
                    bold: true,
                    fontSize: 9,
                    alignment: "right",
                  },
                ],
              },
            ],
          ],
        },
        layout: tableLayout,
        margin: [0, 12, 0, 8],
      },
      {
        text: `SUBJECT TO ${jurisdiction} JURISDICTION.`,
        fontSize: 9,
        alignment: "center",
      },
    ],
  };
};

const buildContentBlock = (opts) => {
  const {
    company,
    client,
    invoiceNumber,
    invoiceDate,
    bodyRows,
    pageBreakBefore,
  } = opts;

  const content = [];
  if (pageBreakBefore) {
    content.push({ text: "", pageBreak: "before" });
  }
  content.push(buildHeader(company));
  content.push(buildPartyTable(client, company, invoiceNumber, invoiceDate));
  content.push({
    table: {
      headerRows: 1,
      widths: ["*", 110],
      body: [servicesTableHeader, ...bodyRows],
    },
    layout: tableLayout,
  });
  content.push(buildFooter(company));
  return content;
};

/**
 * Booking-level Tax Invoice (TourPro invoice / invoice_nonpackage layout).
 */
const generateBookingTaxInvoice = async (data, filePath) => {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) fs.mkdirSync(dirname, { recursive: true });

  const {
    invoiceNumber,
    invoiceDate,
    isPackage,
    client = {},
    agencyDetails = {},
    journeys = [],
    hotels = [],
    vehicles = [],
    services = [],
    costing = {},
  } = data;

  const company = agencyDetails;
  const content = [];
  const hasJourneys = Array.isArray(journeys) && journeys.length > 0;

  if (hasJourneys) {
    const { body } = buildJourneyBody(journeys, Boolean(isPackage));
    content.push(
      ...buildContentBlock({
        company,
        client,
        invoiceNumber,
        invoiceDate,
        bodyRows: body,
        pageBreakBefore: false,
      })
    );
  }

  const pageBreakBefore = hasJourneys;

  if (isPackage) {
    const packageRows = buildPackageSectionRows({
      hotels,
      vehicles,
      services,
      costing,
      journeys,
    });
    // Skip empty package page if nothing to show and journeys already rendered alone
    const hasPackageContent =
      hotels.length ||
      vehicles.length ||
      services.length ||
      toNum(costing.packageCost) !== 0 ||
      toNum(costing.serviceChargeOnPackage) !== 0;

    if (hasPackageContent || !hasJourneys) {
      content.push(
        ...buildContentBlock({
          company,
          client,
          invoiceNumber,
          invoiceDate,
          bodyRows: packageRows,
          pageBreakBefore,
        })
      );
    }
  } else {
    const nonPackageRows = buildNonPackageSectionRows({
      hotels,
      vehicles,
      services,
      costing,
      journeys,
    });
    const hasOther =
      hotels.length ||
      vehicles.length ||
      services.length ||
      toNum(costing.packageServiceCharge) !== 0 ||
      toNum(costing.discount) !== 0 ||
      toNum(costing.gstAmount) !== 0;

    if (hasOther || !hasJourneys) {
      content.push(
        ...buildContentBlock({
          company,
          client,
          invoiceNumber,
          invoiceDate,
          bodyRows: nonPackageRows.length
            ? nonPackageRows
            : [
                [
                  grayCell("Total Amount Chargeable"),
                  grayCell(
                    money(
                      costing.payableAmount != null
                        ? costing.payableAmount
                        : costing.totalPackageCost
                    ),
                    { alignment: "right" }
                  ),
                ],
                [
                  {
                    text: `Amount In Words : ${
                      costing.amountInWords ||
                      wordsFor(
                        costing.payableAmount != null
                          ? costing.payableAmount
                          : costing.totalPackageCost
                      )
                    }`,
                    bold: true,
                    fontSize: 9,
                    fillColor: "#D3D3D3",
                    colSpan: 2,
                  },
                  {},
                ],
              ],
          pageBreakBefore,
        })
      );
    }
  }

  // Fallback: journeys-only already added; ensure at least one page
  if (content.length === 0) {
    content.push(
      ...buildContentBlock({
        company,
        client,
        invoiceNumber,
        invoiceDate,
        bodyRows: [
          [
            grayCell("Total Amount Chargeable"),
            grayCell(money(costing.payableAmount || 0), {
              alignment: "right",
            }),
          ],
          [
            {
              text: `Amount In Words : ${
                costing.amountInWords || wordsFor(costing.payableAmount || 0)
              }`,
              bold: true,
              fontSize: 9,
              fillColor: "#D3D3D3",
              colSpan: 2,
            },
            {},
          ],
        ],
        pageBreakBefore: false,
      })
    );
  }

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
    content,
    styles: {
      companyName: { fontSize: 14, bold: true },
      title: { fontSize: 14, bold: true, decoration: "underline" },
      smallCenter: { fontSize: 8, alignment: "center" },
    },
    defaultStyle: { font: "Roboto", fontSize: 9 },
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

module.exports = generateBookingTaxInvoice;
