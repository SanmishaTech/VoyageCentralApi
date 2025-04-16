const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const mime = require("mime-types");

/**
 * Configuration for a single upload field.
 * @typedef {object} FieldConfig
 * @property {string} name - The name attribute of the form field.
 * @property {string[]} allowedTypes - Array of allowed MIME types (e.g., 'image/jpeg', 'application/pdf').
 * @property {number} maxSize - Maximum file size in bytes.
 */

/**
 * Creates Multer middleware with integrated validation.
 *
 * @param {FieldConfig[]} fields - An array of field configurations.
 * @returns {Function} Express middleware function.
 */
function createUploadMiddleware(fields) {
  if (!Array.isArray(fields) || fields.length === 0) {
    throw new Error("Field configuration array is required.");
  }

  const fieldsConfig = fields.reduce((acc, field) => {
    if (!field.name || !field.allowedTypes || !field.maxSize) {
      throw new Error(
        `Invalid configuration for field: ${JSON.stringify(
          field
        )}. Ensure 'name', 'allowedTypes', and 'maxSize' are provided.`
      );
    }
    acc[field.name] = {
      types: field.allowedTypes,
      maxSize: field.maxSize,
    };
    return acc;
  }, {});

  const multerFields = fields.map((field) => ({ name: field.name }));

  // --- Multer Storage Configuration ---
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      // Generate a unique directory for each request's uploads
      const uniqueReqId = req.uploadUUID || (req.uploadUUID = uuidv4());
      const uploadPath = path.join("uploads", uniqueReqId); // Consider making 'uploads' configurable
      fs.mkdir(uploadPath, { recursive: true }, (err) => {
        if (err) {
          return cb(err);
        }
        cb(null, uploadPath);
      });
    },
    filename: (req, file, cb) => {
      // Sanitize filename if necessary, here using fieldname + timestamp
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(
        null,
        file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
      );
    },
  });

  // --- Multer Instance ---
  // No fileFilter or limits here; validation happens post-upload
  const upload = multer({ storage });

  // --- Validation Middleware ---
  const validateFiles = (req, res, next) => {
    req.uploadErrors = req.uploadErrors || {}; // Initialize if not present

    if (!req.files) {
      // Check if any configured fields were expected but not provided
      fields.forEach((field) => {
        // This basic check assumes fields are required. Add more complex logic if fields are optional.
        // You might need to check req.body to see if the field was intended.
        // For simplicity, we'll assume presence implies requirement for now.
      });
      return next();
    }

    const filesToValidate = Object.entries(req.files);

    filesToValidate.forEach(([fieldname, fileArray]) => {
      const config = fieldsConfig[fieldname];

      if (!config) {
        // Handle unexpected fields
        req.uploadErrors[fieldname] = req.uploadErrors[fieldname] || [];
        req.uploadErrors[fieldname].push({
          type: "unexpected_field",
          message: `Unexpected file field: ${fieldname}`,
        });
        // Mark files for cleanup
        fileArray.forEach((file) => (file.cleanup = true));
        return; // Skip validation for unexpected fields
      }

      fileArray.forEach((file) => {
        let isValid = true;
        const fileMimeType = file.mimetype;

        // 1. Type Validation
        if (!config.types.includes(fileMimeType)) {
          isValid = false;
          req.uploadErrors[fieldname] = req.uploadErrors[fieldname] || [];
          req.uploadErrors[fieldname].push({
            type: "server",
            message: `Invalid file type for ${fieldname}. Allowed: ${config.types.join(
              ", "
            )}. Received: ${fileMimeType}`,
            filename: file.originalname,
          });
        }

        // 2. Size Validation
        if (file.size > config.maxSize) {
          isValid = false;
          req.uploadErrors[fieldname] = req.uploadErrors[fieldname] || [];
          req.uploadErrors[fieldname].push({
            type: "invalid_size",
            message: `File too large for ${fieldname}. Max size: ${
              config.maxSize / 1024 / 1024
            }MB. Received: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
            filename: file.originalname,
          });
        }

        if (!isValid) {
          file.cleanup = true; // Mark invalid file for cleanup
        }
      });
    });

    // --- Cleanup Logic ---
    if (Object.keys(req.uploadErrors).length > 0) {
      let uploadDir = null;
      Object.values(req.files)
        .flat()
        .forEach((file) => {
          // Clean up files marked for cleanup OR all files if any error occurred
          if (file.cleanup) {
            try {
              if (!uploadDir) uploadDir = path.dirname(file.path);
              fs.unlinkSync(file.path);
            } catch (e) {
              console.error(`Failed to cleanup file: ${file.path}`, e); // Log cleanup errors
            }
          }
        });

      // Attempt to remove the unique request directory if it's now empty or only contained invalid files
      if (uploadDir) {
        fs.rmdir(uploadDir, (err) => {
          if (err && err.code !== "ENOENT") {
            // Ignore if already deleted
            console.error(
              `Failed to remove upload directory: ${uploadDir}`,
              err
            );
          }
        });
      }
    }

    next(); // Proceed to the next middleware/controller
  };

  // --- Multer Error Handler Middleware ---
  const handleMulterErrors = (err, req, res, next) => {
    req.uploadErrors = req.uploadErrors || {};
    if (err instanceof multer.MulterError) {
      const field = err.field || "file"; // Default field name if not specified
      req.uploadErrors[field] = req.uploadErrors[field] || [];
      req.uploadErrors[field].push({
        type: `multer_${err.code.toLowerCase()}`,
        message: err.message,
      });
      // Potentially trigger cleanup here as well if needed
      return next(); // Pass control, errors are on req.uploadErrors
    } else if (err) {
      // Handle other potential errors during upload (e.g., disk space)
      req.uploadErrors["general"] = req.uploadErrors["general"] || [];
      req.uploadErrors["general"].push({
        type: "upload_error",
        message: err.message || "An unexpected upload error occurred.",
      });
      return next(); // Pass control
    }
    next(); // No Multer error
  };

  // Return the sequence of middleware functions
  const multerMiddleware = upload.fields(multerFields);
  return [
    (req, res, next) => {
      // Wrap multer middleware to pass errors to our handler
      multerMiddleware(req, res, (err) => {
        if (err) {
          return handleMulterErrors(err, req, res, next);
        }
        next();
      });
    },
    validateFiles, // Our custom validation middleware
  ];
}

module.exports = createUploadMiddleware;
