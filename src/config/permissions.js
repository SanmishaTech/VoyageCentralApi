module.exports = {
  "roles.read": ["admin", "super_admin"],
  "users.read": ["admin", "user", "super_admin"],
  "users.write": ["admin", "super_admin"],
  "users.delete": ["admin", "super_admin"],
  "users.export": ["admin", "super_admin"],
  "packages.read": ["super_admin"], // Permission to read packages
  "packages.write": ["super_admin"], // Permission to create or update packages
  "packages.delete": ["super_admin"], // Permission to delete packages
  "agencies.read": ["super_admin"],
  "agencies.write": ["super_admin"],
  "agencies.delete": ["super_admin"],
  "subscriptions.write": ["super_admin"], // Permission to create or update subscriptions
  "countries.write": ["super_admin"],
  "countries.delete": ["super_admin"],
  "countries.read": ["super_admin"],
};
