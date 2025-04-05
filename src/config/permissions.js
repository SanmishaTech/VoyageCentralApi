module.exports = {
  "roles.read": ["admin"],
  "users.read": ["admin", "user"],
  "users.write": ["admin"],
  "users.delete": ["admin"],
  "users.export": ["admin"],
  "packages.read": ["super_admin"], // Permission to read packages
  "packages.write": ["super_admin"], // Permission to create or update packages
  "packages.delete": ["super_admin"], // Permission to delete packages
};
