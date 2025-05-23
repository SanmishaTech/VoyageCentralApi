const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const dayjs = require("dayjs");
const { z } = require("zod");
const validateRequest = require("../utils/validateUpload");
const createError = require("http-errors"); // For consistent error handling
const path = require("path");
const UPLOAD_DIR_BASE = "uploads"; // Base directory - MUST MATCH STATIC SERVING and middleware config
const TRAVEL_DOCUMENT_MODULE_NAME = "booking/travelDocuments"; // Define module name consistently
const fs = require("fs").promises; // Use promises API

// --- Helper to construct URLs (Updated for new structure) ---
const getFileUrl = (moduleName, fieldName, uuid, filename) => {
  // Check if all required parts are present
  if (!moduleName || !fieldName || !uuid || !filename) return null;

  // IMPORTANT: This path MUST correspond to how you serve static files in Express
  // Example: app.use('/uploads', express.static('uploads')); needs to serve the whole 'uploads' dir

  // Construct the URL: /<base>/<module>/<field>/<uuid>/<filename>
  return `/${UPLOAD_DIR_BASE}/${moduleName}/${fieldName}/${uuid}/${filename}`;
};

// Create a new tour
const createTravelDocument = async (req, res, next) => {
  const schema = z.object({
    description: z
      .string()
      .min(1, "Description cannot be left blank.")
      .max(2000, "Description must not exceed 2000 characters."),
    isPrivate: z
      .string()
      .refine((val) => val === "true" || val === "false", {
        message: "isPrivate must be either 'true' or 'false' as a string.",
      })
      .transform((val) => val === "true"),
  });

  // satrt

  // 2. Validate Request Body + Files (remains the same)
  const validationResult = await validateRequest(
    schema,
    req.body,
    req.uploadErrors
  );

  if (!validationResult.success) {
    if (req.cleanupUpload) await req.cleanupUpload(req); // Cleanup on validation fail
    return res.status(400).json({ errors: validationResult.errors });
  }

  // 3. Extract Data and File Info (remains the same)
  const { description, isPrivate } = validationResult.data;
  const { id } = req.params;

  const uploadUUID = req.uploadUUID;
  const attachmentFile = req.files?.attachment?.[0];
  const attachmentFilename = attachmentFile ? attachmentFile.filename : null;

  // end
  try {
    const newTravelDocument = await prisma.travelDocument.create({
      data: {
        bookingId: parseInt(id, 10),
        description: description,
        isPrivate: isPrivate,
        attachment: attachmentFilename || null,
        uploadUUID: uploadUUID || null,
      },
    });

    res.status(201).json(newTravelDocument);
  } catch (error) {
    // Cleanup on error (remains the same logic)
    if (req.cleanupUpload) {
      console.log("Attempting cleanup due to error during tour creation...");
      await req.cleanupUpload(req).catch((cleanupErr) => {
        console.error("Error during post-error cleanup:", cleanupErr);
      });
    }
    // Handle Specific Prisma Errors (remains the same)
    return res.status(500).json({
      errors: {
        message: "Failed to create TRAVEL DOCUMENT",
        details: error.message,
      },
    });
  }
};

// Get a tour by ID
const getTravelDocumentById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const travelDocument = await prisma.travelDocument.findFirst({
      where: {
        AND: [{ id: parseInt(id, 10) }],
      },
    });

    if (!travelDocument) {
      return res
        .status(404)
        .json({ errors: { message: "Travel document not found" } });
    }

    const travelDocumentWithDetails = {
      ...travelDocument,
      attachmentUrl: getFileUrl(
        TRAVEL_DOCUMENT_MODULE_NAME, // module
        "attachment", // field
        travelDocument.uploadUUID,
        travelDocument.attachment
      ),
    };

    res.status(200).json(travelDocumentWithDetails);
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ errors: { message: "Travel document not found" } });
    }
    res.status(500).json({
      errors: {
        message: "Failed to fetch travel document",
        details: error.message,
      },
    });
  }
};

// Update a tour //was here
const updateTravelDocument = async (req, res, next) => {
  const schema = z.object({
    description: z
      .string()
      .min(1, "Description cannot be left blank.")
      .max(2000, "Description must not exceed 2000 characters."),
    isPrivate: z
      .string()
      .refine((val) => val === "true" || val === "false", {
        message: "isPrivate must be either 'true' or 'false' as a string.",
      })
      .transform((val) => val === "true"),
  });

  // start
  const { id } = req.params;
  const travelDocumentId = parseInt(id, 10);
  const requestUploadUUID = req.uploadUUID; // UUID for *this* request's potential new uploads

  console.log(`[Update Start:${requestUploadUUID}] Updating agency ID: ${id}`);
  console.log(
    `[Update Files:${requestUploadUUID}] Req Files:`,
    req.files ? Object.keys(req.files) : "None"
  );
  console.log(`[Update Body:${requestUploadUUID}] Req Body:`, req.body);

  try {
    // 1. Validate Body + Check Middleware Upload Errors
    const validationResult = await validateRequest(
      schema, // Use the updated schema allowing null for filenames
      req.body,
      req.uploadErrors
    );

    if (!validationResult.success) {
      console.log(
        `[Update Validation Fail:${requestUploadUUID}] Errors:`,
        validationResult.errors
      );
      if (req.cleanupUpload) await req.cleanupUpload(req); // Cleanup *this* request's uploads
      return res.status(400).json({ errors: validationResult.errors });
    }

    // 2. Fetch Existing Agency Data (including file info)
    const existingTravelDocument = await prisma.travelDocument.findUnique({
      where: { id: travelDocumentId },
    });

    if (!existingTravelDocument) {
      console.log(
        `[Update Error:${requestUploadUUID}] Tour ${travelDocumentId} not found.`
      );
      if (req.cleanupUpload) await req.cleanupUpload(req); // Cleanup *this* request's uploads
      return next(
        createError(404, `Tour with ID ${travelDocumentId} not found.`)
      );
    }

    // 3. Prepare Update: Determine target state and file operations
    const dataToUpdate = { ...validationResult.data }; // Start with validated body fields
    // const dataToUpdate = req.body; // Start with validated body fields
    const newAttachmentFile = req.files?.attachment?.[0];
    const hasNewUploads = !!newAttachmentFile;
    const oldUploadUUID = existingTravelDocument.uploadUUID;

    let targetUploadUUID = hasNewUploads ? requestUploadUUID : oldUploadUUID;
    if (hasNewUploads) {
      dataToUpdate.uploadUUID = targetUploadUUID; // Set DB field if new UUID is used
      console.log(
        `[Update Files:${requestUploadUUID}] New uploads detected. Target UUID = ${targetUploadUUID}`
      );
    } else {
      console.log(
        `[Update Files:${requestUploadUUID}] No new uploads. Target UUID = ${targetUploadUUID}`
      );
    }

    const filesToCopy = []; // { sourcePath: string, destPath: string, fieldName: string }
    const filesToDelete = []; // { fullPath: string, fieldName: string }

    // --- Logo Handling ---
    // Check if body explicitly requests removal (null value)
    const wantsToRemoveAttachment =
      dataToUpdate.hasOwnProperty("attachment") &&
      dataToUpdate.attachment === null;

    if (newAttachmentFile) {
      // A. New logo uploaded
      dataToUpdate.attachment = newAttachmentFile.filename; // Update DB field
      console.log(
        `[Update Files:${requestUploadUUID}] New attachment: ${newAttachmentFile.filename}`
      );
      // Mark old logo for deletion if it existed
      if (oldUploadUUID && existingTravelDocument.attachment) {
        filesToDelete.push({
          fullPath: path.join(
            UPLOAD_DIR_BASE,
            TRAVEL_DOCUMENT_MODULE_NAME,
            "attachment",
            oldUploadUUID,
            existingTravelDocument.attachment
          ),
          fieldName: "attachment",
        });
      }
    } else if (wantsToRemoveAttachment) {
      // B. Explicitly removing logo (via null in body)
      dataToUpdate.attachment = null; // Ensure DB field is set to null
      console.log(
        `[Update Files:${requestUploadUUID}] Removing Logo explicit.`
      );
      // Mark old logo for deletion if it existed
      if (oldUploadUUID && existingTravelDocument.attachment) {
        filesToDelete.push({
          fullPath: path.join(
            UPLOAD_DIR_BASE,
            TRAVEL_DOCUMENT_MODULE_NAME,
            "attachment",
            oldUploadUUID,
            existingTravelDocument.attachment
          ),
          fieldName: "attachment",
        });
      }
    } else {
      // C. No new logo, not removing: Keep existing file reference
      // Remove from dataToUpdate only if it wasn't explicitly set (to avoid overriding with undefined)
      if (!dataToUpdate.hasOwnProperty("attachment")) {
        delete dataToUpdate.attachment;
      }
      console.log(
        `[Update Files:${requestUploadUUID}] Keeping existing Logo ref.`
      );
      // *** Crucial: If UUID changed (due to other file upload), copy existing logo to new location ***
      if (hasNewUploads && oldUploadUUID && existingTravelDocument.attachment) {
        const sourcePath = path.join(
          UPLOAD_DIR_BASE,
          TRAVEL_DOCUMENT_MODULE_NAME,
          "attachment",
          oldUploadUUID,
          existingTravelDocument.attachment
        );
        const destPath = path.join(
          UPLOAD_DIR_BASE,
          TRAVEL_DOCUMENT_MODULE_NAME,
          "attachment",
          targetUploadUUID,
          existingTravelDocument.attachment
        ); // Keep same filename
        filesToCopy.push({ sourcePath, destPath, fieldName: "attachment" });
      }
    }

    // --- Optional: Nullify UUID if both final files are null AND no new UUID was generated ---
    const finalAttachmentFilename = dataToUpdate.hasOwnProperty("attachment")
      ? dataToUpdate.attachment
      : existingTravelDocument.attachment;

    if (finalAttachmentFilename === null && !hasNewUploads && oldUploadUUID) {
      // If both are cleared, and we didn't create a new UUID folder for this request,
      // we can nullify the reference in the DB. The files should already be marked for deletion.
      console.log(
        `[Update Files:${requestUploadUUID}] Both files null, no new uploads. Nullifying UUID.`
      );
      dataToUpdate.uploadUUID = null;
      targetUploadUUID = null; // Update local variable too
    } else if (finalAttachmentFilename === null && hasNewUploads) {
      // If both are cleared, but we *did* create a new UUID (which is now empty),
      // still nullify the DB reference, but the cleanup function for *this request* should handle the empty new folders.
      console.log(
        `[Update Files:${requestUploadUUID}] Both files null, new UUID created (will be empty). Nullifying UUID in DB.`
      );
      dataToUpdate.uploadUUID = null;
      targetUploadUUID = null;
    }

    // 5. Check if any actual changes (DB fields or file operations)
    // const hasDbFieldChanges = Object.keys(dataToUpdate).some(
    //   (key) => dataToUpdate[key] !== existingTravelDocument[key]
    // );
    const hasDbFieldChanges = Object.keys(dataToUpdate).some((key) => {
      const oldValue = existingTravelDocument[key];
      const newValue = dataToUpdate[key];

      // Normalize both values
      if (typeof oldValue === "boolean" || typeof newValue === "boolean") {
        return Boolean(oldValue) !== Boolean(newValue);
      }

      if (typeof oldValue === "number" || typeof newValue === "number") {
        return Number(oldValue) !== Number(newValue);
      }

      // Handle null vs undefined vs string
      if (
        (oldValue === null || oldValue === undefined) &&
        (newValue === null || newValue === undefined)
      ) {
        return false; // Both null-ish
      }

      return oldValue !== newValue;
    });
    console.log("isPrivate from client:", req.body.isPrivate);
    console.log("isPrivate parsed:", validationResult.data.isPrivate);
    console.log("existing isPrivate:", existingTravelDocument.isPrivate);

    // File actions include copies, deletes, or simply updating the filename/UUID ref in DB
    const hasFileActions =
      filesToCopy.length > 0 ||
      filesToDelete.length > 0 ||
      dataToUpdate.hasOwnProperty("attachment") ||
      dataToUpdate.hasOwnProperty("uploadUUID");

    if (!hasDbFieldChanges && !hasFileActions) {
      console.log(
        `[Update No Changes:${requestUploadUUID}] No effective changes.`
      );
      // Cleanup *this request's* potentially unused upload directory IF it was created
      if (req.cleanupUpload && hasNewUploads) {
        await req.cleanupUpload(req);
      }

      // Return current data
      const currentFullTravelDocument = await prisma.travelDocument.findUnique({
        where: { id: travelDocumentId },
      }); // Fetch full data
      return res.status(200).json({
        message: "No changes applied.",
        agency: {
          ...currentFullTravelDocument,
          attachmentUrl: getFileUrl(
            TRAVEL_DOCUMENT_MODULE_NAME,
            "attachment",
            currentFullTravelDocument.uploadUUID,
            currentFullTravelDocument.attachment
          ),
        },
      });
    }

    console.log(
      `[Update Changes:${requestUploadUUID}] Changes detected. DB Data:`,
      dataToUpdate
    );
    console.log(
      `[Update Changes:${requestUploadUUID}] Files to Copy:`,
      filesToCopy.map((f) => f.fieldName)
    );
    console.log(
      `[Update Changes:${requestUploadUUID}] Files to Delete:`,
      filesToDelete.map((f) => f.fieldName)
    );
    // end

    const { description, isPrivate } = validationResult.data;

    // try {
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: "User does not belong to any Agency" });
    }

    // First, delete itineraries that are not in the new itineraries array

    // Now, proceed to update the tour and upsert itineraries
    const updatedTravelDocument = await prisma.travelDocument.update({
      where: { id: parseInt(id, 10) },
      data: {
        description: description || null,
        isPrivate: isPrivate,
        // ...dataToUpdate,
        attachment: finalAttachmentFilename || null,
        uploadUUID: targetUploadUUID || null,
      },
    });

    // start
    let fileOpErrors = [];

    // --- 7a. Copy necessary files ---
    if (filesToCopy.length > 0) {
      console.log(`[Update File Ops:${requestUploadUUID}] Copying files...`);
      await Promise.all(
        filesToCopy.map(async (op) => {
          try {
            const destDir = path.dirname(op.destPath);
            await fs.mkdir(destDir, { recursive: true }); // Ensure destination dir exists
            await fs.copyFile(op.sourcePath, op.destPath);
            console.log(
              `[Update File Ops:${requestUploadUUID}] Copied ${
                op.fieldName
              }: ${path.basename(op.sourcePath)} -> ${path.basename(
                op.destPath
              )}`
            );
          } catch (err) {
            console.error(
              `[Update File Ops ERROR:${requestUploadUUID}] Failed to copy ${op.fieldName} from ${op.sourcePath} to ${op.destPath}:`,
              err
            );
            fileOpErrors.push(`Failed to copy ${op.fieldName}.`);
          }
        })
      );
    }

    // --- 7b. Delete old/replaced files ---
    if (filesToDelete.length > 0) {
      console.log(
        `[Update File Ops:${requestUploadUUID}] Deleting old files...`
      );
      await Promise.all(
        filesToDelete.map(async (op) => {
          try {
            await fs.unlink(op.fullPath);
            console.log(
              `[Update File Ops:${requestUploadUUID}] Deleted old ${op.fieldName} file: ${op.fullPath}`
            );
          } catch (err) {
            if (err.code === "ENOENT") {
              console.log(
                `[Update File Ops:${requestUploadUUID}] Old ${op.fieldName} file not found (OK): ${op.fullPath}`
              );
            } else {
              console.error(
                `[Update File Ops ERROR:${requestUploadUUID}] Failed to delete old ${op.fieldName} file ${op.fullPath}:`,
                err
              );
              fileOpErrors.push(`Failed to delete old ${op.fieldName} file.`);
            }
          }
        })
      );
    }

    // --- NOTE: No directory cleanup here ---
    // We are only deleting specific files. The middleware handles cleanup for *this request*.
    // Old, potentially empty directories from previous UUIDs might remain.

    // 8. Success Response
    console.log(`[Update Success:${requestUploadUUID}] Process completed.`);
    const responsePayload = {
      message: "travel document updated successfully.",
      agency: {
        ...updatedTravelDocument, // Use the final state from DB
        attachmentUrl: getFileUrl(
          TRAVEL_DOCUMENT_MODULE_NAME,
          "attachment",
          updatedTravelDocument.uploadUUID,
          updatedTravelDocument.attachment
        ),
      },
    };
    if (fileOpErrors.length > 0) {
      responsePayload.warnings = fileOpErrors; // Include warnings if file ops failed
      console.warn(
        `[Update Success:${requestUploadUUID}] Update finished with file operation warnings:`,
        fileOpErrors
      );
    }

    res.status(200).json(responsePayload);
    // end

    // res.status(200).json(result.updatedTour);
  } catch (error) {
    // --- Error Handling ---
    console.error(
      `[Update FATAL ERROR:${requestUploadUUID}] Error updating agency ${travelDocumentId}:`,
      error
    );
    // Cleanup *this request's* uploads if error occurred after validation
    if (req.cleanupUpload) {
      console.log(
        `[Update Error Cleanup:${requestUploadUUID}] Attempting cleanup...`
      );
      await req.cleanupUpload(req).catch((cleanupErr) => {
        console.error(
          `[Update Error Cleanup:${requestUploadUUID}] Cleanup failed:`,
          cleanupErr
        );
      });
    }

    // Handle specific Prisma errors (remain the same)
    if (error.code === "P2025")
      return next(
        createError(404, `Update failed: travel document ${tourId} not found.`)
      );

    return res.status(500).json({
      errors: {
        message: "Failed to create travel document",
        details: error.message,
      },
    });
  }
};

// Delete a tour
const deleteTravelDocument = async (req, res, next) => {
  const { id } = req.params;
  const travelDocumentId = parseInt(id, 10);

  if (isNaN(travelDocumentId)) {
    return next(createError(400, "Invalid travel document ID."));
  }

  try {
    // 1. Fetch agency UUID BEFORE deleting

    // Foreign key constraint failed (tour is referenced in other tables)
    const travelDocumentToDelete = await prisma.travelDocument.findUnique({
      where: { id: travelDocumentId },
      select: { uploadUUID: true }, // Need UUID for file cleanup
    });

    if (!travelDocumentToDelete) {
      return next(
        createError(
          404,
          `Travel Document with ID ${travelDocumentId} not found.`
        )
      );
    }

    // 2. Delete the agency record (Prisma handles cascades if set)
    await prisma.travelDocument.delete({
      where: { id: travelDocumentId },
    });

    // 3. Delete associated upload files/directories (AFTER successful DB delete)
    if (travelDocumentToDelete.uploadUUID) {
      const uuid = travelDocumentToDelete.uploadUUID;
      const fieldsToDelete = ["attachment"]; // Fields associated with this module

      console.log(`[Delete] Attempting file cleanup for UUID: ${uuid}`);
      for (const fieldName of fieldsToDelete) {
        const fieldDirPath = path.join(
          UPLOAD_DIR_BASE,
          TRAVEL_DOCUMENT_MODULE_NAME,
          fieldName,
          uuid
        );
        try {
          // Use fs.rm to remove the field-specific directory and its contents within the UUID folder
          await fs.rm(fieldDirPath, { recursive: true, force: true });
        } catch (err) {
          console.error(err);
        }
      }
    } else {
      console.log(
        `[Delete] Tour ${travelDocumentId} had no upload UUID. No file cleanup needed.`
      );
    }

    // 4. Success Response
    res.status(204).send();
  } catch (error) {
    if (
      error.code === "P2003" ||
      error.message.includes("Foreign key constraint failed")
    ) {
      return res.status(409).json({
        errors: {
          message:
            "Cannot delete this travel document because it is referenced in related data.",
        },
      });
    }

    console.error(`Error deleting tour ${travelDocumentId}:`, error);
    if (error.code === "P2025") {
      return next(
        createError(
          404,
          `Travel document with ID ${travelDocumentId} not found.`
        )
      );
    }
    return res.status(500).json({
      errors: {
        message: "Failed to delete travel Document",
        details: error.message,
      },
    });
  }
};

const getAllTravelDocumentsByBookingId = async (req, res) => {
  const { id } = req.params;

  try {
    const travelDocuments = await prisma.travelDocument.findMany({
      where: { bookingId: parseInt(id) },
    });

    res.status(200).json({ travelDocuments });
  } catch (error) {
    res.status(500).json({
      errors: {
        message: "Failed to fetch travel documents",
        details: error.message,
      },
    });
  }
};

module.exports = {
  createTravelDocument,
  getTravelDocumentById,
  updateTravelDocument,
  deleteTravelDocument,
  getAllTravelDocumentsByBookingId,
};
