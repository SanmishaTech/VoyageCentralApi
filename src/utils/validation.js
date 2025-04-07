const validateRequest = async (schema, req) => {
  try {
    await schema.validateAsync(req.body, { abortEarly: false });
    return null; // No validation errors
  } catch (error) {
    const errors = error.details.reduce((acc, curr) => {
      acc[curr.context.key] = curr.message;
      return acc;
    }, {});
    return errors; // Return validation errors
  }
};

module.exports = validateRequest;
