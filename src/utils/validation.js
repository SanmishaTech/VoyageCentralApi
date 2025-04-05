const validateRequest = (schema, req) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.reduce((acc, curr) => {
      acc[curr.context.key] = curr.message;
      return acc;
    }, {});
    return errors;
  }
  return null;
};

module.exports = validateRequest;
