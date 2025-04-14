const multer = require("multer");
const path = require("path");

// Configure storage for images
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/images/"); // Directory for storing images
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Configure storage for PDFs
const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/pdfs/"); // Directory for storing PDFs
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// File filter for images
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPEG, PNG, JPG, and WEBP are allowed for images."
      )
    );
  }
};

// File filter for PDFs
const pdfFileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PDF files are allowed."));
  }
};

// Combined multer instance for handling both logo and letterHead
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === "logo") {
        cb(null, "uploads/images/"); // Directory for storing images
      } else if (file.fieldname === "letterHead") {
        cb(null, "uploads/pdfs/"); // Directory for storing PDFs
      } else {
        cb(new Error("Unexpected field."));
      }
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "logo") {
      // Validate logo file type
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/webp",
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new Error(
            "Invalid file type for logo. Only JPEG, PNG, JPG, and WEBP are allowed."
          )
        );
      }
    } else if (file.fieldname === "letterHead") {
      // Validate letterHead file type
      if (file.mimetype === "application/pdf") {
        cb(null, true);
      } else {
        cb(
          new Error(
            "Invalid file type for letterHead. Only PDF files are allowed."
          )
        );
      }
    } else {
      cb(new Error("Unexpected field."));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit file size to 10MB for both fields
  },
});

module.exports = {
  upload,
};
