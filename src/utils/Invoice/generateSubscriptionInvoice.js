const PdfPrinter = require("pdfmake");
const fs = require("fs"); // Used for saving the file, not for loading fonts
const path = require("path"); // Used for path operations for saving, not for loading fonts

// Attempt to load the VFS data from pdfmake's build.
const vfsCandidate = require("pdfmake/build/vfs_fonts.js");
let vfsData = null;

if (vfsCandidate) {
  if (vfsCandidate.pdfMake && vfsCandidate.pdfMake.vfs) {
    vfsData = vfsCandidate.pdfMake.vfs; // Common case: module.exports = { pdfMake: { vfs: ... } }
  } else if (vfsCandidate.vfs) {
    vfsData = vfsCandidate.vfs; // Case: module.exports = { vfs: ... }
  } else {
    vfsData = vfsCandidate; // Case: module.exports = { "Roboto-Regular.ttf": "..." }
  }
}

// Fallback if VFS data could not be loaded or is not in expected format
if (!vfsData || typeof vfsData["Roboto-Regular.ttf"] !== "string") {
  console.error(
    "Failed to load vfs_fonts.js or VFS data is not in the expected format. PDF generation may fail or use fallback fonts."
  );
  // Provide a minimal fallback VFS or handle error appropriately
  // For now, if vfsData is null/invalid, PdfPrinter will likely fail to find fonts.
  // This should ideally throw an error to prevent silent failures.
  vfsData = {}; // Prevents crash on Buffer.from if keys are missing, but PDF will be broken.
}

const fonts = {
  Roboto: {
    // Ensure vfsData keys exist before trying to create Buffer, or handle potential errors.
    normal: vfsData["Roboto-Regular.ttf"]
      ? Buffer.from(vfsData["Roboto-Regular.ttf"], "base64")
      : null,
    bold: vfsData["Roboto-Medium.ttf"]
      ? Buffer.from(vfsData["Roboto-Medium.ttf"], "base64")
      : null,
    italics: vfsData["Roboto-Italic.ttf"]
      ? Buffer.from(vfsData["Roboto-Italic.ttf"], "base64")
      : null,
    bolditalics: vfsData["Roboto-MediumItalic.ttf"]
      ? Buffer.from(vfsData["Roboto-MediumItalic.ttf"], "base64")
      : null,
  },
};

// Filter out null fonts in case some were not found in vfsData, to prevent errors with PdfPrinter
Object.keys(fonts.Roboto).forEach((key) => {
  if (fonts.Roboto[key] === null) {
    console.warn(
      `Font style ${key} for Roboto not found in VFS data. It will be unavailable.`
    );
    delete fonts.Roboto[key]; // Remove if null to avoid PdfPrinter errors with null font buffers
  }
});

const printer = new PdfPrinter(fonts);

// Helper to format date as DD/MM/YYYY
const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Generates an invoice PDF and saves it to the specified file path.
 * @param {object} invoiceData - Data to populate the invoice.
 * @param {string} filePath - The full path where the PDF will be saved.
 * @returns {Promise<void>}
 */
const generateSubscriptionInvoice = async (invoiceData, filePath) => {
  // Ensure the directory exists
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }

  const {
    invoiceNumber,
    invoiceDate,
    client, // { clientName, addressLines (array), city, pincode, gstin (optional) }
    sanmishaDetails, // { name, addressLines (array), city, pincode, gstinUin, email, logoPath (optional) }
    items, // array of { srNo, description, hsnSac (optional), amount }
    totals, // { amountBeforeTax, cgstAmount, sgstAmount, igstAmount (optional), totalAmount, amountInWords }
  } = invoiceData;

  // Company details from image (can be passed in sanmishaDetails or hardcoded/configured elsewhere)
  const companyDetails = sanmishaDetails || {
    logoPath: path.join(__dirname, "..", "assets", "brandlogo.png"), // Ensure this path is correct and image exists
    name: "BBN Global",
    addressLines: [
      "2/3, Gomati Apartment,",
      "Boy's Town Road, Nashik, Maharashtra - 422002",
    ],
    gstinUin: "27AAHCB7744A1ZT",
    email: "sanmishaDetails.ho@gmail.com",
  };

  const clientAddress = client.addressLines
    ? client.addressLines.join("\n")
    : "";
  const companyAddress = companyDetails.addressLines.join("\n");

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60], // [left, top, right, bottom]
    content: [
      // Header: Tax Invoice

      // Top section: Client details on left, Company details on right
      {
        columns: [
          // Left column: Client Details
          {
            width: "50%",
            stack: [
              { text: client.clientName, style: "subheader" },
              { text: clientAddress, style: "normalText" },
              {
                text: `${client.city || ""} - ${client.pincode || ""}`,
                style: "normalText",
              },
              client.gstin
                ? { text: `GSTIN: ${client.gstin}`, style: "normalText" }
                : "",
              {
                margin: [0, 10, 0, 10],
                table: {
                  widths: ["auto", "*"],
                  body: [
                    [
                      {
                        text: "Invoice No.:",
                        style: "boldText",
                        border: [false, false, false, false],
                      },
                      {
                        text: invoiceNumber,
                        style: "normalText",
                        border: [false, false, false, false],
                      },
                    ],
                    [
                      {
                        text: "Invoice Date:",
                        style: "boldText",
                        border: [false, false, false, false],
                      },
                      {
                        text: formatDate(invoiceDate),
                        style: "normalText",
                        border: [false, false, false, false],
                      },
                    ],
                  ],
                },
                layout: "noBorders",
              },
            ],
          },
          // Right column: Company Details & Logo
          {
            width: "50%",
            alignment: "right",
            stack: [
              companyDetails.logoPath && fs.existsSync(companyDetails.logoPath)
                ? {
                    image: companyDetails.logoPath,
                    width: 120,
                    alignment: "right",
                    margin: [0, 0, 0, 10],
                  }
                : { text: "", margin: [0, 0, 0, 10] }, // Logo placeholder if not found
              { text: companyDetails.name, style: "companyName" },
              { text: companyAddress, style: "normalTextRight" },
              {
                text: `GSTIN: ${companyDetails.gstin}`,
                style: "normalTextRight",
              },
              {
                text: `Email: ${companyDetails.email}`,
                style: "normalTextRight",
              },
            ],
          },
        ],
        columnGap: 20,
        margin: [0, 0, 0, 20], // bottom margin for the columns section
      },
      { text: "Tax Invoice", style: "header" },

      // Line Items Table
      {
        table: {
          headerRows: 1,
          widths: ["auto", "*", "auto", "auto"], // Sr.No., Description, HSN/SAC, Amount
          body: [
            // Header Row
            [
              { text: "Sr No.", style: "tableHeader" },
              { text: "Description of Services", style: "tableHeader" },
              { text: "HSN/SAC", style: "tableHeader" },
              { text: "Amount", style: "tableHeader", alignment: "right" },
            ],
            // Data Rows (map through items)
            ...items.map((item) => [
              { text: item.srNo, style: "tableCell" },
              { text: item.description, style: "tableCell" },
              { text: item.hsnSac || "", style: "tableCell" }, // Optional HSN/SAC
              {
                text: item.amount.toFixed(2),
                style: "tableCell",
                alignment: "right",
              },
            ]),
            // Totals integrated into the table
            [
              {
                text: "Amount before Tax:",
                style: "tableTotalsLabel",
                colSpan: 3,
                alignment: "right",
                border: [true, true, false, false],
                marginTop: 5,
              },
              {},
              {},
              {
                text: totals.amountBeforeTax.toFixed(2),
                style: "tableTotalsValue",
                alignment: "right",
                border: [false, true, true, false],
                marginTop: 5,
              },
            ],
            ...(totals.cgstAmount > 0
              ? [
                  [
                    {
                      text: `ADD CGST (${(totals.cgstRate || 0).toFixed(2)}%):`,
                      style: "tableTotalsLabel",
                      colSpan: 3,
                      alignment: "right",
                      border: [true, false, false, false],
                    },
                    {},
                    {},
                    {
                      text: totals.cgstAmount.toFixed(2),
                      style: "tableTotalsValue",
                      alignment: "right",
                      border: [false, false, true, false],
                    },
                  ],
                ]
              : []),
            ...(totals.sgstAmount > 0
              ? [
                  [
                    {
                      text: `ADD SGST (${(totals.sgstRate || 0).toFixed(2)}%):`,
                      style: "tableTotalsLabel",
                      colSpan: 3,
                      alignment: "right",
                      border: [true, false, false, false],
                    },
                    {},
                    {},
                    {
                      text: totals.sgstAmount.toFixed(2),
                      style: "tableTotalsValue",
                      alignment: "right",
                      border: [false, false, true, false],
                    },
                  ],
                ]
              : []),
            ...(totals.igstAmount > 0
              ? [
                  [
                    {
                      text: `ADD IGST (${(totals.igstRate || 0).toFixed(2)}%):`,
                      style: "tableTotalsLabel",
                      colSpan: 3,
                      alignment: "right",
                      border: [true, false, false, false],
                    },
                    {},
                    {},
                    {
                      text: totals.igstAmount.toFixed(2),
                      style: "tableTotalsValue",
                      alignment: "right",
                      border: [false, false, true, false],
                    },
                  ],
                ]
              : []),
            [
              {
                text: "Total Amount after Tax:",
                style: "tableTotalsLabelBold",
                bold: true,
                colSpan: 3,
                alignment: "right",
                border: [true, true, false, true],
                paddingTop: 5,
                paddingBottom: 5,
              },
              {},
              {},
              {
                text: totals.totalAmount.toFixed(2),
                style: "tableTotalsValueBold",
                bold: true,
                alignment: "right",
                border: [false, true, true, true],
                paddingTop: 5,
                paddingBottom: 5,
              },
            ],
          ],
        },
        layout: {
          hLineWidth: function (i, node) {
            // Stronger lines for header, before totals, and after totals
            if (i === 0 || i === 1) return 1; // Top and header bottom line
            if (i > node.table.body.length - 5 && i < node.table.body.length)
              return 0.5; // Lines for totals
            if (i === node.table.body.length - 5) return 1; // Line before first total
            if (i === node.table.body.length) return 1; // Bottom line of table
            return 0.5; // Default for item rows
          },
          vLineWidth: function (i, node) {
            return i === 0 || i === node.table.widths.length ? 1 : 0.5;
          },
          hLineColor: function (i, node) {
            return "black";
          }, // All horizontal lines black
          vLineColor: function (i, node) {
            return "black";
          }, // All vertical lines black
          paddingTop: function (i, node) {
            return i === 0 ? 5 : i >= node.table.body.length - 4 ? 3 : 4;
          },
          paddingBottom: function (i, node) {
            return i === 0 ? 5 : i >= node.table.body.length - 4 ? 3 : 4;
          },
        },
      },

      // Old Totals Section is now removed as it's integrated into the table above

      // Amount in Words
      {
        text: [
          { text: "Amount in Words: ", style: "boldText" },
          { text: totals.amountInWords, style: "normalText" },
        ],
        margin: [0, 20, 0, 0], // Top margin
      },

      // Horizontal Line
      {
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 5,
            x2: 515,
            y2: 5,
            lineWidth: 1,
            lineColor: "#cccccc",
          },
        ],
        margin: [0, 20, 0, 10],
      },

      // Signature Section
      {
        columns: [
          { text: "", width: "*" }, // Spacer
          {
            width: "auto",
            stack: [
              {
                text: `For ${client.clientName}`,
                style: "signatureText",
                alignment: "right",
              },
              { text: "\n\n\n", style: "normalText" }, // Vertical space for signature
              {
                text: "Authorised Signatory",
                style: "signatureText",
                alignment: "right",
              },
            ],
            margin: [0, 20, 0, 20],
          },
        ],
      },

      // Thank You Note
      {
        text: "Thank you for your business!",
        style: "thankYouText",
        alignment: "center",
        margin: [0, 0, 0, 20],
      },
    ],
    styles: {
      header: {
        fontSize: 20,
        bold: true,
        alignment: "center",
        margin: [0, 0, 0, 20], // bottom margin
      },
      companyName: {
        fontSize: 16,
        bold: true,
        alignment: "right",
        margin: [0, 0, 0, 5],
      },
      subheader: {
        fontSize: 12,
        bold: true,
        margin: [0, 0, 0, 2], // bottom margin
      },
      normalText: { fontSize: 9, margin: [0, 1, 0, 1], lineHeight: 1.2 },
      normalTextRight: {
        fontSize: 9,
        margin: [0, 1, 0, 1],
        alignment: "right",
        lineHeight: 1.2,
      },
      boldText: { fontSize: 9, bold: true },
      tableHeader: {
        bold: true,
        fontSize: 10,
        color: "black",
        fillColor: "#f2f2f2",
        alignment: "center",
        margin: [0, 4, 0, 4],
      },
      tableCell: { fontSize: 9, margin: [5, 3, 5, 3] },
      tableTotalsLabel: { fontSize: 9, bold: false, margin: [5, 2, 5, 2] },
      tableTotalsValue: { fontSize: 9, bold: false, margin: [5, 2, 5, 2] },
      tableTotalsLabelBold: { fontSize: 9, bold: true, margin: [5, 2, 5, 2] },
      tableTotalsValueBold: { fontSize: 9, bold: true, margin: [5, 2, 5, 2] },
      signatureText: { fontSize: 10, bold: true },
      thankYouText: { fontSize: 9, italics: true, color: "gray" },
    },
    defaultStyle: {
      font: "Roboto",
      columnGap: 20,
    },
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  return new Promise((resolve, reject) => {
    console.log("Creating write stream at:", filePath); // LOG
    const stream = fs.createWriteStream(filePath);

    stream.on("error", (err) => {
      console.error("Stream error:", err); // LOG error
      reject(err);
    });

    stream.on("finish", () => {
      console.log("PDF write finished successfully"); // LOG success
      resolve();
    });

    pdfDoc.pipe(stream);
    pdfDoc.end();
  });

  //   return new Promise((resolve, reject) => {
  //     const stream = fs.createWriteStream(filePath);
  //     pdfDoc.pipe(stream);
  //     pdfDoc.end();
  //     stream.on("finish", resolve);
  //     stream.on("error", reject);
  //   });
};

module.exports = { generateSubscriptionInvoice };
