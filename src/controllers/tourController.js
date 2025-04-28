const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const dayjs = require("dayjs");
const { z } = require("zod");
const validateRequest = require("../utils/validateUpload");
const createError = require("http-errors"); // For consistent error handling
const path = require("path");

const UPLOAD_DIR_BASE = "uploads"; // Base directory - MUST MATCH STATIC SERVING and middleware config
const TOUR_MODULE_NAME = "tour"; // Define module name consistently

// --- Helper to construct URLs (Updated for new structure) ---
const getFileUrl = (moduleName, fieldName, uuid, filename) => {
  // Check if all required parts are present
  if (!moduleName || !fieldName || !uuid || !filename) return null;

  // IMPORTANT: This path MUST correspond to how you serve static files in Express
  // Example: app.use('/uploads', express.static('uploads')); needs to serve the whole 'uploads' dir

  // Construct the URL: /<base>/<module>/<field>/<uuid>/<filename>
  return `/${UPLOAD_DIR_BASE}/${moduleName}/${fieldName}/${uuid}/${filename}`;
};

// Get all tours with pagination, sorting, and search
const getTours = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

  try {
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: "User does not belong to any Agency" });
    }

    const whereClause = {
      agencyId: req.user.agencyId,
      OR: [
        { tourTitle: { contains: search } },
        { tourType: { contains: search } },
        { status: { contains: search } },
        { destination: { contains: search } },
        { sector: { sectorName: { contains: search } } },
      ],
    };

    const tours = await prisma.tour.findMany({
      where: whereClause,
      skip,
      take: limit,
      // orderBy: { [sortBy]: sortOrder },
      orderBy:
        sortBy === "sectorName"
          ? { sector: { sectorName: sortOrder } }
          : { [sortBy]: sortOrder },
      include: {
        sector: true,
      },
    });

    const totalTours = await prisma.tour.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalTours / limit);

    res.json({
      tours,
      page,
      totalPages,
      totalTours,
    });
  } catch (error) {
    return res.status(500).json({
      errors: {
        message: "Failed to fetch tours",
        details: error.message,
      },
    });
  }
};

// Create a new tour
const createTour = async (req, res, next) => {
  const schema = z
    .object({
      tourTitle: z
        .string()
        .min(1, "Tour title cannot be left blank.")
        .max(100, "Tour title must not exceed 100 characters."),
      tourType: z.string().optional(),
      destination: z.string().optional(),
      status: z.string().optional(),
      sectorId: z.string().optional(),
      notes: z.string().optional(),
      itineraries: z
        .array(
          z.object({
            day: z
              .number({
                required_error: "Day is required.",
                invalid_type_error: "Day must be a number.",
              })
              .int("Package ID must be an integer."),
            description: z.string().min(1, "Description cannot be blank."),
            cityId: z.string().optional(),
          })
        )
        .optional(),
    })
    .superRefine(async (data, ctx) => {
      if (!req.user.agencyId) {
        return res
          .status(404)
          .json({ message: "User does not belong to any Agency" });
      }
      const existingTour = await prisma.tour.findFirst({
        where: {
          AND: [
            { tourTitle: data.tourTitle },
            { agencyId: parseInt(req.user.agencyId) },
          ],
        },
      });

      if (existingTour) {
        ctx.addIssue({
          path: ["tourTitle"],
          message: `Tour with title ${data.tourTitle} already exists.`,
        });
      }
    });

  // satrt
  let itinerariesData;
  if (req.body.itineraries) {
    try {
      itinerariesData = JSON.parse(req.body.itineraries);
      req.body.itineraries = itinerariesData;
    } catch (error) {
      return next(createError(400, "Invalid JSON format for itineraries."));
    }
  }

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
  const {
    tourTitle,
    tourType,
    destination,
    status,
    sectorId,
    notes,
    itineraries = [],
  } = req.body;

  const uploadUUID = req.uploadUUID;
  const attachmentFile = req.files?.attachment?.[0];
  const attachmentFilename = attachmentFile ? attachmentFile.filename : null;

  // end
  try {
    const newTour = await prisma.tour.create({
      data: {
        tourTitle,
        agencyId: req.user.agencyId,
        tourType: tourType || null,
        destination: destination || null,
        status: status || null,
        sectorId: sectorId ? parseInt(sectorId, 10) : null,
        attachment: attachmentFilename || null,
        uploadUUID: uploadUUID || null,
        notes: notes || null,
        itineraries: {
          create: (itineraries || []).map((itinerary) => ({
            day: itinerary.day,
            description: itinerary.description,
            cityId: itinerary.cityId ? parseInt(itinerary.cityId, 10) : null,
          })),
        },
      },
    });

    res.status(201).json(newTour);
  } catch (error) {
    console.error("Error during tour creation:", error);
    // Cleanup on error (remains the same logic)
    if (req.cleanupUpload) {
      console.log("Attempting cleanup due to error during tour creation...");
      await req.cleanupUpload(req).catch((cleanupErr) => {
        console.error("Error during post-error cleanup:", cleanupErr);
      });
    }
    // Handle Specific Prisma Errors (remains the same)
    if (error.code === "P2002") {
      const field = error.meta?.target?.join(", ") || "field";
      let message = `tour or related itinearies already exists with this ${field}.`;
      return res
        .status(409)
        .json({ errors: { general: message, [field]: message } });
    }
    return res.status(500).json({
      errors: {
        message: "Failed to create tour",
        details: error.message,
      },
    });
  }
};

// Get a tour by ID
const getTourById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const tour = await prisma.tour.findFirst({
      where: {
        AND: [
          { id: parseInt(id, 10) },
          { agencyId: parseInt(req.user.agencyId) },
        ],
      },
      include: {
        itineraries: true, // Include itineraries in the response
      },
    });

    if (!tour) {
      return res.status(404).json({ errors: { message: "Tour not found" } });
    }

    const tourWithDetails = {
      ...tour,
      attachmentUrl: getFileUrl(
        TOUR_MODULE_NAME, // module
        "attachment", // field
        tour.uploadUUID,
        tour.attachment
      ),
    };

    res.status(200).json(tourWithDetails);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "Tour not found" } });
    }
    res.status(500).json({
      errors: {
        message: "Failed to fetch tour",
        details: error.message,
      },
    });
  }
};

// Update a tour
const updateTour = async (req, res, next) => {
  const schema = z
    .object({
      tourTitle: z
        .string()
        .min(1, "Tour title cannot be left blank.")
        .max(100, "Tour title must not exceed 100 characters."),
      tourType: z.string().optional(),
      destination: z.string().optional(),
      status: z.string().optional(),
      sectorId: z.string().optional(),
      notes: z.string().optional(),
      itineraries: z
        .array(
          z.object({
            id: z.string().optional(), // Include ID for existing itineraries
            day: z
              .number({
                required_error: "Day is required.",
                invalid_type_error: "Day must be a number.",
              })
              .int("Day must be an integer."),
            description: z.string().min(1, "Description cannot be blank."),
            cityId: z.string().optional(),
          })
        )
        .optional(),
    })
    .superRefine(async (data, ctx) => {
      if (!req.user.agencyId) {
        return res
          .status(404)
          .json({ message: "User does not belong to any Agency" });
      }
      const { id } = req.params;

      const existingTourTitle = await prisma.tour.findFirst({
        where: {
          AND: [
            { tourTitle: data.tourTitle },
            { agencyId: parseInt(req.user.agencyId) },
          ],
        },
        select: { id: true },
      });

      if (existingTourTitle && existingTourTitle.id !== parseInt(id)) {
        ctx.addIssue({
          path: ["tourTitle"],
          message: `Tour with title ${data.tourTitle} already exists.`,
        });
      }
    });

  // start
  const { id } = req.params;
  const tourId = parseInt(id, 10);
  const requestUploadUUID = req.uploadUUID; // UUID for *this* request's potential new uploads

  console.log(`[Update Start:${requestUploadUUID}] Updating agency ID: ${id}`);
  console.log(
    `[Update Files:${requestUploadUUID}] Req Files:`,
    req.files ? Object.keys(req.files) : "None"
  );
  console.log(`[Update Body:${requestUploadUUID}] Req Body:`, req.body);

  try {
    if (req.body.itineraries) {
      try {
        itinerariesData = JSON.parse(req.body.itineraries);
        req.body.itineraries = itinerariesData;
      } catch (error) {
        return next(createError(400, "Invalid JSON format for itineraries."));
      }
    }

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
    console.log(`[Update Validation OK:${requestUploadUUID}]`);

    // 2. Fetch Existing Agency Data (including file info)
    const existingTour = await prisma.tour.findUnique({
      where: { id: tourId },
    });

    if (!existingTour) {
      console.log(
        `[Update Error:${requestUploadUUID}] Tour ${tourId} not found.`
      );
      if (req.cleanupUpload) await req.cleanupUpload(req); // Cleanup *this* request's uploads
      return next(createError(404, `Tour with ID ${tourId} not found.`));
    }

    // 3. Prepare Update: Determine target state and file operations
    const dataToUpdate = { ...validationResult.data }; // Start with validated body fields
    // const dataToUpdate = req.body; // Start with validated body fields
    const newAttachmentFile = req.files?.attachment?.[0];
    const hasNewUploads = !!newAttachmentFile;
    const oldUploadUUID = existingTour.uploadUUID;

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
      if (oldUploadUUID && existingTour.attachment) {
        filesToDelete.push({
          fullPath: path.join(
            UPLOAD_DIR_BASE,
            TOUR_MODULE_NAME,
            "attachment",
            oldUploadUUID,
            existingTour.attachment
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
      if (oldUploadUUID && existingTour.attachment) {
        filesToDelete.push({
          fullPath: path.join(
            UPLOAD_DIR_BASE,
            TOUR_MODULE_NAME,
            "attachment",
            oldUploadUUID,
            existingTour.attachment
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
      if (hasNewUploads && oldUploadUUID && existingTour.attachment) {
        const sourcePath = path.join(
          UPLOAD_DIR_BASE,
          TOUR_MODULE_NAME,
          "attachment",
          oldUploadUUID,
          existingTour.attachment
        );
        const destPath = path.join(
          UPLOAD_DIR_BASE,
          TOUR_MODULE_NAME,
          "attachment",
          targetUploadUUID,
          existingTour.attachment
        ); // Keep same filename
        filesToCopy.push({ sourcePath, destPath, fieldName: "attachment" });
      }
    }

    // --- Optional: Nullify UUID if both final files are null AND no new UUID was generated ---
    const finalAttachmentFilename = dataToUpdate.hasOwnProperty("attachment")
      ? dataToUpdate.attachment
      : existingTour.attachment;

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
    const hasDbFieldChanges = Object.keys(dataToUpdate).some(
      (key) => dataToUpdate[key] !== existingTour[key]
    );
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
      const currentFullTour = await prisma.tour.findUnique({
        where: { id: tourId },
      }); // Fetch full data
      return res.status(200).json({
        message: "No changes applied.",
        agency: {
          ...currentFullTour,
          attachmentUrl: getFileUrl(
            TOUR_MODULE_NAME,
            "attachment",
            currentFullTour.uploadUUID,
            currentFullTour.attachment
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

    const {
      tourTitle,
      tourType,
      destination,
      status,
      sectorId,
      attachment,
      notes,
      itineraries = [],
    } = req.body;

    // try {
    if (!req.user.agencyId) {
      return res
        .status(404)
        .json({ message: "User does not belong to any Agency" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // First, delete itineraries that are not in the new itineraries array
      await tx.itinerary.deleteMany({
        where: {
          tourId: parseInt(id, 10),
          id: {
            notIn: itineraries
              .filter((i) => parseInt(i.itineraryId))
              .map((i) => parseInt(i.itineraryId)), // Only keep existing itineraries in the list
          },
        },
      });

      // Now, proceed to update the tour and upsert itineraries
      const updatedTour = await tx.tour.update({
        where: { id: parseInt(id, 10) },
        data: {
          tourTitle,
          tourType: tourType || null,
          destination: destination || null,
          status: status || null,
          sectorId: sectorId ? parseInt(sectorId, 10) : null,
          attachment: finalAttachmentFilename || null,
          uploadUUID: targetUploadUUID || null,
          notes: notes || null,
          itineraries: {
            upsert: itineraries
              .filter((itinerary) => !!parseInt(itinerary.itineraryId)) // Only existing itineraries
              .map((itinerary) => ({
                where: { id: parseInt(itinerary.itineraryId) },
                update: {
                  day: itinerary.day,
                  description: itinerary.description,
                  cityId: itinerary.cityId
                    ? parseInt(itinerary.cityId, 10)
                    : null,
                },
                create: {
                  day: itinerary.day,
                  description: itinerary.description,
                  cityId: itinerary.cityId
                    ? parseInt(itinerary.cityId, 10)
                    : null,
                },
              })),
            create: itineraries
              .filter((itinerary) => !parseInt(itinerary.itineraryId)) // Only new itineraries
              .map((itinerary) => ({
                day: itinerary.day,
                description: itinerary.description,
                cityId: itinerary.cityId
                  ? parseInt(itinerary.cityId, 10)
                  : null,
              })),
          },
        },
      });

      return {
        updatedTour: updatedTour,
      };
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
      message: "Tour updated successfully.",
      agency: {
        ...result.updatedTour, // Use the final state from DB
        attachmentUrl: getFileUrl(
          TOUR_MODULE_NAME,
          "attachment",
          result.updatedTour.uploadUUID,
          result.updatedTour.attachment
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
      `[Update FATAL ERROR:${requestUploadUUID}] Error updating agency ${tourId}:`,
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
      return next(createError(404, `Update failed: Tour ${tourId} not found.`));
    if (error.code === "P2002") {
      const field = error.meta?.target?.join(", ") || "field";
      return res.status(409).json({
        errors: {
          general: `Unique constraint violation on ${field}.`,
          ...(field === "tourTitle" && {
            tourTitle: `tour title already exist.`,
          }),
        },
      });
    }
    return res.status(500).json({
      errors: {
        message: "Failed to create fair",
        details: error.message,
      },
    });
  }
};

// Delete a tour
const deleteTour = async (req, res, next) => {
  const { id } = req.params;
  const tourId = parseInt(id, 10);

  if (isNaN(tourId)) {
    return next(createError(400, "Invalid tour ID."));
  }

  try {
    // 1. Fetch agency UUID BEFORE deleting
    const tourToDelete = await prisma.tour.findUnique({
      where: { id: tourId },
      select: { uploadUUID: true }, // Need UUID for file cleanup
    });

    if (!tourToDelete) {
      return next(createError(404, `Tour with ID ${tourId} not found.`));
    }

    // 2. Delete the agency record (Prisma handles cascades if set)
    await prisma.tour.delete({
      where: { id: tourId },
    });
    console.log(`[Delete] DB record for tour ${tourId} deleted.`);

    // 3. Delete associated upload files/directories (AFTER successful DB delete)
    if (tourToDelete.uploadUUID) {
      const uuid = tourToDelete.uploadUUID;
      const fieldsToDelete = ["attachment"]; // Fields associated with this module

      console.log(`[Delete] Attempting file cleanup for UUID: ${uuid}`);
      for (const fieldName of fieldsToDelete) {
        const fieldDirPath = path.join(
          UPLOAD_DIR_BASE,
          TOUR_MODULE_NAME,
          fieldName,
          uuid
        );
        try {
          console.log(`[Delete] Removing directory: ${fieldDirPath}`);
          // Use fs.rm to remove the field-specific directory and its contents within the UUID folder
          await fs.rm(fieldDirPath, { recursive: true, force: true });
          console.log(`[Delete] Removed ${fieldDirPath} (or it didn't exist).`);
        } catch (err) {
          // Log error but don't fail the request
          console.error(
            `[Delete] Failed to remove directory ${fieldDirPath} for deleted agency ${tourId}:`,
            err
          );
        }
      }
      // Optional: Try removing the module's top-level UUID folder if it's now empty
      // This is more complex and might have race conditions. Sticking to field dir removal is safer.
      /*
      const moduleUUIDPath = path.join(UPLOAD_DIR_BASE, AGENCY_MODULE_NAME, uuid);
       try {
           await fs.rmdir(moduleUUIDPath); // rmdir fails if not empty
           console.log(`[Delete] Successfully removed now-empty module UUID directory: ${moduleUUIDPath}`);
       } catch (err) {
           if (err.code !== 'ENOENT' && err.code !== 'ENOTEMPTY') { // Ignore "not found" or "not empty"
              console.error(`[Delete] Error trying to remove module UUID directory ${moduleUUIDPath}:`, err);
           }
       }
       */
    } else {
      console.log(
        `[Delete] Tour ${tourId} had no upload UUID. No file cleanup needed.`
      );
    }

    // 4. Success Response
    res.status(204).send();
  } catch (error) {
    console.error(`Error deleting tour ${tourId}:`, error);
    if (error.code === "P2025") {
      return next(createError(404, `Tour with ID ${tourId} not found.`));
    }
    return res.status(500).json({
      errors: {
        message: "Failed to create tour",
        details: error.message,
      },
    });
  }
};

module.exports = {
  getTours,
  createTour,
  getTourById,
  updateTour,
  deleteTour,
};
