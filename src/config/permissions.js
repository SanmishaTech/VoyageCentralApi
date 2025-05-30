module.exports = {
  //only superadmin section
  //users
  "users.read": ["super_admin"],
  "users.write": ["super_admin"],
  "users.delete": ["super_admin"],
  "users.export": ["super_admin"],
  //agencies
  "agencies.read": ["super_admin", "admin", "branch_admin", "user"],
  "agencies.write": ["super_admin", "admin", "branch_admin", "user"],
  "agencies.delete": ["super_admin", "admin", "branch_admin", "user"],
  //packages
  "packages.read": ["super_admin"],
  "packages.write": ["super_admin"],
  "packages.delete": ["super_admin"],
  "subscriptions.write": ["super_admin"],
  "subscriptions.read": ["super_admin"],
  //superAdmin and admin sections
  //branches
  "branches.read": ["super_admin", "admin", "branch_admin", "user"],
  "branches.write": ["super_admin", "admin"],
  "branches.delete": ["super_admin", "admin"],
  //countries
  "countries.write": ["super_admin", "admin", "branch_admin", "user"],
  "countries.delete": ["super_admin", "admin", "branch_admin", "user"],
  "countries.read": ["super_admin", "admin", "branch_admin", "user"],
  //states
  "states.write": ["super_admin", "admin", "branch_admin", "user"],
  "states.delete": ["super_admin", "admin", "branch_admin", "user"],
  "states.read": ["super_admin", "admin", "branch_admin", "user"],
  //cities
  "cities.write": ["super_admin", "admin", "branch_admin", "user"],
  "cities.delete": ["super_admin", "admin", "branch_admin", "user"],
  "cities.read": ["super_admin", "admin", "branch_admin", "user"],
  //sectors
  "sectors.write": ["super_admin", "admin", "branch_admin", "user"],
  "sectors.delete": ["super_admin", "admin", "branch_admin", "user"],
  "sectors.read": ["super_admin", "admin", "branch_admin", "user"],
  //roles
  "roles.read": ["super_admin", "admin", "branch_admin", "user"],
  //staff
  "staff.read": ["admin", "branch_admin", "user"],
  "staff.write": ["admin", "branch_admin", "user"],
  "staff.delete": ["admin", "branch_admin", "user"],
  //accommodations
  "accommodations.write": ["super_admin", "admin", "branch_admin", "user"],
  "accommodations.delete": ["super_admin", "admin", "branch_admin", "user"],
  "accommodations.read": ["super_admin", "admin", "branch_admin", "user"],
  //vehicles
  "vehicles.write": ["super_admin", "admin", "branch_admin", "user"],
  "vehicles.delete": ["super_admin", "admin", "branch_admin", "user"],
  "vehicles.read": ["super_admin", "admin", "branch_admin", "user"],
  //airlines
  "airlines.write": ["super_admin", "admin", "branch_admin", "user"],
  "airlines.delete": ["super_admin", "admin", "branch_admin", "user"],
  "airlines.read": ["super_admin", "admin", "branch_admin", "user"],
  //hotels
  "hotels.write": ["super_admin", "admin", "branch_admin", "user"],
  "hotels.delete": ["super_admin", "admin", "branch_admin", "user"],
  "hotels.read": ["super_admin", "admin", "branch_admin", "user"],
  //agents
  "agents.write": ["super_admin", "admin", "branch_admin", "user"],
  "agents.delete": ["super_admin", "admin", "branch_admin", "user"],
  "agents.read": ["super_admin", "admin", "branch_admin", "user"],
  //clients
  "clients.write": ["super_admin", "admin", "branch_admin", "user"],
  "clients.delete": ["super_admin", "admin", "branch_admin", "user"],
  "clients.read": ["super_admin", "admin", "branch_admin", "user"],
  //banks
  "banks.write": ["super_admin", "admin", "branch_admin", "user"],
  "banks.delete": ["super_admin", "admin", "branch_admin", "user"],
  "banks.read": ["super_admin", "admin", "branch_admin", "user"],
  //services
  "services.write": ["super_admin", "admin", "branch_admin", "user"],
  "services.delete": ["super_admin", "admin", "branch_admin", "user"],
  "services.read": ["super_admin", "admin", "branch_admin", "user"],
  //tours
  "tours.write": ["super_admin", "admin", "branch_admin", "user"],
  "tours.delete": ["super_admin", "admin", "branch_admin", "user"],
  "tours.read": ["super_admin", "admin", "branch_admin", "user"],
  //bookings
  "bookings.write": ["super_admin", "admin", "branch_admin", "user"],
  "bookings.delete": ["super_admin", "admin", "branch_admin", "user"],
  "bookings.read": ["super_admin", "admin", "branch_admin", "user"],
  // followUps
  "followUps.write": ["super_admin", "admin", "branch_admin", "user"],
  "followUps.read": ["super_admin", "admin", "branch_admin", "user"],
  //hotelBookings
  "hotelBookings.write": ["super_admin", "admin", "branch_admin", "user"],
  "hotelBookings.delete": ["super_admin", "admin", "branch_admin", "user"],
  "hotelBookings.read": ["super_admin", "admin", "branch_admin", "user"],
  //journeyBookings
  "journeyBookings.write": ["super_admin", "admin", "branch_admin", "user"],
  "journeyBookings.delete": ["super_admin", "admin", "branch_admin", "user"],
  "journeyBookings.read": ["super_admin", "admin", "branch_admin", "user"],
  //serviceBookings
  "serviceBookings.write": ["super_admin", "admin", "branch_admin", "user"],
  "serviceBookings.delete": ["super_admin", "admin", "branch_admin", "user"],
  "serviceBookings.read": ["super_admin", "admin", "branch_admin", "user"],
  //vehicleBookings
  "vehicleBookings.write": ["super_admin", "admin", "branch_admin", "user"],
  "vehicleBookings.delete": ["super_admin", "admin", "branch_admin", "user"],
  "vehicleBookings.read": ["super_admin", "admin", "branch_admin", "user"],
  //tourMembers
  "tourMembers.write": ["super_admin", "admin", "branch_admin", "user"],
  "tourMembers.delete": ["super_admin", "admin", "branch_admin", "user"],
  "tourMembers.read": ["super_admin", "admin", "branch_admin", "user"],
  //travelDocuments
  "travelDocuments.write": ["super_admin", "admin", "branch_admin", "user"],
  "travelDocuments.delete": ["super_admin", "admin", "branch_admin", "user"],
  "travelDocuments.read": ["super_admin", "admin", "branch_admin", "user"],
  //bookingReceipts
  "bookingReceipts.write": ["super_admin", "admin", "branch_admin", "user"],
  "bookingReceipts.delete": ["super_admin", "admin", "branch_admin", "user"],
  "bookingReceipts.read": ["super_admin", "admin", "branch_admin", "user"],
  //dashboard
  "dashboard.write": ["super_admin", "admin", "branch_admin", "user"],
  "dashboard.delete": ["super_admin", "admin", "branch_admin", "user"],
  "dashboard.read": ["super_admin", "admin", "branch_admin", "user"],
  //groupBookings
  "groupBookings.write": ["super_admin", "admin", "branch_admin", "user"],
  "groupBookings.delete": ["super_admin", "admin", "branch_admin", "user"],
  "groupBookings.read": ["super_admin", "admin", "branch_admin", "user"],
  //groupClientBookings
  "groupClientBookings.write": ["super_admin", "admin", "branch_admin", "user"],
  "groupClientBookings.delete": [
    "super_admin",
    "admin",
    "branch_admin",
    "user",
  ],
  "groupClientBookings.read": ["super_admin", "admin", "branch_admin", "user"],

  //groupClientJourneyBookings
  "groupClientJourneyBookings.write": [
    "super_admin",
    "admin",
    "branch_admin",
    "user",
  ],
  "groupClientJourneyBookings.delete": [
    "super_admin",
    "admin",
    "branch_admin",
    "user",
  ],
  "groupClientJourneyBookings.read": [
    "super_admin",
    "admin",
    "branch_admin",
    "user",
  ],

  //groupClientBookingReceipts
  "groupClientBookingReceipts.write": [
    "super_admin",
    "admin",
    "branch_admin",
    "user",
  ],
  "groupClientBookingReceipts.delete": [
    "super_admin",
    "admin",
    "branch_admin",
    "user",
  ],
  "groupClientBookingReceipts.read": [
    "super_admin",
    "admin",
    "branch_admin",
    "user",
  ],
};
