const validateRequest = (schema, data, res) => {
  return new Promise(async (resolve, reject) => {
    const result = await schema.safeParseAsync(data);

    if (!result.success) {
      // If validation fails, reject with a custom error that will send a 400 response
      return res.status(400).json({
        errors: result.error.errors.map((e) => ({
          path: e.path,
          message: e.message,
        })),
      });
    }

    // If validation is successful, resolve with the validated data
    resolve(result.data);
  });
};

module.exports = validateRequest;
