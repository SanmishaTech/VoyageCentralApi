const path = require("path");
const fs = require("fs");

const buildAgencyDetails = (agency) => {
  if (!agency) {
    return {
      name: "Agency",
      addressLines: [],
      city: "",
      stateName: "",
      stateCode: "",
      pincode: "",
      gstinUin: "",
      pan: "",
      email: "",
      phone: "",
      logoPath: null,
      bank: null,
      jurisdiction: "THE LOCAL",
    };
  }

  const addressLines = [
    agency.addressLine1,
    agency.addressLine2,
    [agency.cityName, agency.stateName].filter(Boolean).join(", "),
  ].filter(Boolean);

  let logoPath = null;
  if (agency.uploadUUID && agency.logoFilename) {
    const candidate = path.join(
      __dirname,
      "..",
      "..",
      "uploads",
      agency.uploadUUID,
      agency.logoFilename
    );
    if (fs.existsSync(candidate)) logoPath = candidate;
  }

  // Agency has no PAN field in schema — leave blank if absent
  const pan = agency.pan || agency.panNumber || agency.panNo || "";

  // State code not on Agency schema — leave blank if absent
  const stateCode = agency.stateCode || agency.gstStateCode || "";

  let bank = null;
  const banks = agency.banks || [];
  if (banks.length > 0) {
    const b = banks[0];
    bank = {
      bankName: b.bankName || "",
      branch: b.branch || b.branchName || null,
      accountName: b.accountName || b.beneficiaryName || null,
      accountNo: b.accountNo || b.accountNumber || null,
      ifsc: b.ifsc || b.ifscCode || null,
    };
    // If only bankName exists (current Bank model), still pass it
    if (!bank.bankName && !bank.accountNo && !bank.ifsc) bank = null;
  }

  return {
    name: agency.businessName || "Agency",
    addressLines,
    city: agency.cityName || "",
    stateName: agency.stateName || "",
    stateCode,
    pincode: agency.pincode || "",
    gstinUin: agency.gstin || "",
    pan,
    email: agency.contactPersonEmail || "",
    phone: agency.contactPersonPhone || "",
    contactPersonName: agency.contactPersonName || "",
    logoPath,
    bank,
    jurisdiction: agency.cityName || "THE LOCAL",
  };
};

const buildClientDetails = (client) => {
  if (!client) {
    return {
      clientName: "Client",
      addressLines: [],
      city: "",
      pincode: "",
      gstin: "",
      mobile: "",
      mobile2: "",
      email: "",
    };
  }
  return {
    clientName: client.clientName || "Client",
    addressLines: [client.address1, client.address2].filter(Boolean),
    city: client.city?.cityName || client.cityName || "",
    pincode: client.pincode || "",
    gstin: client.gstin || "",
    mobile: client.mobile1 || "",
    mobile2: client.mobile2 || "",
    email: client.email || "",
  };
};

module.exports = { buildAgencyDetails, buildClientDetails };
