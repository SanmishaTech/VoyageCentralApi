module.exports = {
  //only superadmin section
  //users
  "users.read": ["super_admin"],
  "users.write": ["super_admin"],
  "users.delete": ["super_admin"],
  "users.export": ["super_admin"],
  //agencies
  "agencies.read": ["super_admin"],
  "agencies.write": ["super_admin"],
  "agencies.delete": ["super_admin"],
  //packages
  "packages.read": ["super_admin"],
  "packages.write": ["super_admin"],
  "packages.delete": ["super_admin"],
  "subscriptions.write": ["super_admin"],
  //superAdmin and admin sections
  //branches
  "branches.read": ["super_admin", "admin"],
  "branches.write": ["super_admin", "admin"],
  "branches.delete": ["super_admin", "admin"],
  //countries
  "countries.write": ["super_admin", "admin"],
  "countries.delete": ["super_admin", "admin"],
  "countries.read": ["super_admin", "admin"],
  //states
  "states.write": ["super_admin", "admin"],
  "states.delete": ["super_admin", "admin"],
  "states.read": ["super_admin", "admin"],
  //cities
  "cities.write": ["super_admin", "admin"],
  "cities.delete": ["super_admin", "admin"],
  "cities.read": ["super_admin", "admin"],
  //sectors
  "sectors.write": ["super_admin", "admin"],
  "sectors.delete": ["super_admin", "admin"],
  "sectors.read": ["super_admin", "admin"],
  //roles
  "roles.read": ["super_admin", "admin"],
  //staff
  "staff.read": ["admin"],
  "staff.write": ["admin"],
  "staff.delete": ["admin"],
  //accommodations
  "accommodations.write": ["super_admin", "admin"],
  "accommodations.delete": ["super_admin", "admin"],
  "accommodations.read": ["super_admin", "admin"],
  //vehicles
  "vehicles.write": ["super_admin", "admin"],
  "vehicles.delete": ["super_admin", "admin"],
  "vehicles.read": ["super_admin", "admin"],
  //airlines
  "airlines.write": ["super_admin", "admin"],
  "airlines.delete": ["super_admin", "admin"],
  "airlines.read": ["super_admin", "admin"],
  //hotels
  "hotels.write": ["super_admin", "admin"],
  "hotels.delete": ["super_admin", "admin"],
  "hotels.read": ["super_admin", "admin"],
  //clients
  "clients.write": ["super_admin", "admin"],
  "clients.delete": ["super_admin", "admin"],
  "clients.read": ["super_admin", "admin"],
  //banks
  "banks.write": ["super_admin", "admin"],
  "banks.delete": ["super_admin", "admin"],
  "banks.read": ["super_admin", "admin"],
  //fairs
  "fairs.write": ["super_admin", "admin"],
  "fairs.delete": ["super_admin", "admin"],
  "fairs.read": ["super_admin", "admin"],
  //tours
  "tours.write": ["super_admin", "admin"],
  "tours.delete": ["super_admin", "admin"],
  "tours.read": ["super_admin", "admin"],
  //bookings
  "bookings.write": ["super_admin", "admin", "user"],
  "bookings.delete": ["super_admin", "admin", "user"],
  "bookings.read": ["super_admin", "admin", "user"],
  // followUps
  "followUps.write": ["super_admin", "admin", "user"],
  "followUps.read": ["super_admin", "admin", "user"],
};
