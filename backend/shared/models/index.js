/**
 * Shared Models
 * These models are used across multiple services to ensure schema consistency.
 * All services that share a database should import models from here.
 *
 * Connection will be established by the individual services.
 * This file only exports the schema definitions.
 */

const mongoose = require("mongoose");

// Import models
const PermitForm = require("./PermitForm");
const Fee = require("./Fee");
const ClaimableDocument = require("./ClaimableDocument");

// Export mongoose and models
module.exports = {
  mongoose,
  PermitForm,
  Fee,
  ClaimableDocument,
};
