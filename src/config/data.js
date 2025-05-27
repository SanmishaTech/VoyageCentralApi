module.exports = {
  GENDER_MALE: "Male",
  GENDER_FEMALE: "Female",
  GENDER_OTHER: "Other",

  FOOD_TYPE_VEG: "Veg",
  FOOD_TYPE_NON_VEG: "Non Veg",
  FOOD_TYPE_HINDU_NON_VEG: "Hindu Non Veg",

  TOUR_TYPE_TAILORMADE_TOUR: "Tailormade Tour",
  TOUR_TYPE_HONEYMOON_TOUR: "Honeymoon Tour",
  TOUR_TYPE_GROUP_TOUR: "Group Tour",

  DESTINATION_DOMESTIC: "Domestic",
  DESTINATION_INTERNATIONAL: "International",

  STATUS_OPEN: "Open",
  STATUS_CLOSE: "Close",

  BUDGET_NONE: "none",
  BUDGET_BUDGET: "Budget",
  BUDGET_DELUXE: "Deluxe",
  BUDGET_PREMIUM: "Premium",

  // Adults 0–20
  ...Object.fromEntries(
    Array.from({ length: 21 }, (_, i) => [`ADULTS_${i}`, String(i)])
  ),
  ADULTS_NONE: "none",

  // Children 5 to 11
  ...Object.fromEntries(
    Array.from({ length: 21 }, (_, i) => [`CHILDREN_5_TO_11_${i}`, String(i)])
  ),
  CHILDREN_5_TO_11_NONE: "none",

  // Children below 5
  ...Object.fromEntries(
    Array.from({ length: 21 }, (_, i) => [`CHILDREN_BELOW_5_${i}`, String(i)])
  ),
  CHILDREN_BELOW_5_NONE: "none",
};
