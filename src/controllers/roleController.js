const roles = require("../config/roles");

const getRoles = async (req, res, next) => {
  try {
    // Return all roles as a list
    res.json({ roles });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRoles,
};
