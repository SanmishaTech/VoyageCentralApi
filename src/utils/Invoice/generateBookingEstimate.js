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
  },
};
Object.keys(fonts.Roboto).forEach((k) => {
  if (!fonts.Roboto[k]) delete fonts.Roboto[k];
});
const printer = new PdfPrinter(fonts);

const money = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Enquiry estimate PDF (TourPro estimate) — from enquiry costing lines.
 */
const generateBookingEstimate = async (data, filePath) => {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) fs.mkdirSync(dirname, { recursive: true });

  const {
    bookingNumber,
    client,
    agencyDetails,
    lines = [],
    totalPackageCost,
    costingNote,
  } = data;

  const company = agencyDetails;
  const rows = lines.map((line, idx) => [
    { text: String(idx + 1), fontSize: 9 },
    { text: line.fairName || "", fontSize: 9 },
    { text: line.description || "", fontSize: 9 },
    { text: money(line.cost), fontSize: 9, alignment: "right" },
  ]);

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [40, 50, 40, 50],
    content: [
      {
        text: company.name || "",
        fontSize: 14,
        bold: true,
        alignment: "center",
      },
      {
        text: (company.addressLines || []).join(", "),
        fontSize: 8,
        alignment: "center",
        margin: [0, 0, 0, 8],
      },
      {
        text: "Estimate",
        fontSize: 14,
        bold: true,
        alignment: "center",
        decoration: "underline",
        margin: [0, 0, 0, 10],
      },
      {
        columns: [
          { text: `Client: ${client.clientName || ""}`, fontSize: 10, bold: true },
          { text: `Enquiry No: ${bookingNumber || ""}`, fontSize: 10, alignment: "right" },
        ],
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: [30, 80, "*", 80],
          body: [
            [
              { text: "Sr", bold: true, fillColor: "#EEEEEE", fontSize: 9 },
              { text: "Fair", bold: true, fillColor: "#EEEEEE", fontSize: 9 },
              { text: "Description", bold: true, fillColor: "#EEEEEE", fontSize: 9 },
              {
                text: "Cost",
                bold: true,
                fillColor: "#EEEEEE",
                fontSize: 9,
                alignment: "right",
              },
            ],
            ...rows,
            [
              { text: "", colSpan: 3, border: [false, false, false, false] },
              {},
              {},
              {
                text: money(totalPackageCost),
                bold: true,
                fontSize: 10,
                alignment: "right",
              },
            ],
          ],
        },
      },
      costingNote
        ? {
            text: `Note: ${costingNote}`,
            fontSize: 9,
            margin: [0, 12, 0, 0],
          }
        : {},
    ],
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

module.exports = generateBookingEstimate;
