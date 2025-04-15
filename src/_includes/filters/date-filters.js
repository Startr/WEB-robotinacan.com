/**
 * Date formatting functions for Eleventy
 */

// Format date as ISO string for datetime attribute
module.exports.dateIso = function(date) {
  return new Date(date).toISOString();
};

// Format date for display
module.exports.dateDisplay = function(date) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(date).toLocaleDateString('en-US', options);
};
