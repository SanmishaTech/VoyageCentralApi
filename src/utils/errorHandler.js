const createError = require('http-errors');
const Joi = require('joi'); // Import Joi

const errorHandler = (err, req, res, next) => {
  if (err instanceof createError.HttpError) {
    res.status(err.status).json({
      errors: { message: err.message },
    });
  } else if (err instanceof Joi.ValidationError) {
    res.status(400).json({
      errors: err.details.reduce((acc, curr) => {
        acc[curr.context.key] = curr.message;
        return acc;
      }, {}),
    });
  } else {
    res.status(err.statusCode || 500).json({
      errors: { message: err.message || 'Internal Server Error' },
    });
  }
};

module.exports = { errorHandler };
