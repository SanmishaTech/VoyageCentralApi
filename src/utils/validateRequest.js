const validateRequest = async (schema, data, res) => {
  const result = await schema.safeParseAsync(data);

  if (!result.success) {
    // Return a 400 response with validation errors
    return res.status(400).json({
      errors: result.error.errors.map((e) => ({
        path: e.path,
        message: e.message,
      })),
    });
  }

  return result.data; // Return validated data if successful
};

module.exports = validateRequest;
