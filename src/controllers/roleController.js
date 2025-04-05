const roles = require('../config/roles');

const getAllRoles = async (req, res, next) => {
  try {
    // Return all roles as a list
    res.json({ roles });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllRoles,
};
