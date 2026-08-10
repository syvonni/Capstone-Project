/**
 * Audit Metadata Builder
 *
 * PURPOSE: This utility provides a builder pattern for constructing audit metadata.
 * It centralizes the logic for fetching user information, request information, entity fields,
 * and change tracking. This eliminates the need to manually construct metadata objects
 * in each route handler, ensuring consistency across all audit logs.
 *
 * USAGE EXAMPLE (for variables):
 *
 * // BEFORE (manual metadata construction):
 * const metadata = {
 *   variableId: bracket._id,
 *   name: bracket.name,
 *   minValue: bracket.minValue,
 *   maxValue: bracket.maxValue,
 *   rate: bracket.rate,
 *   userName: user.firstName + ' ' + user.lastName,
 *   userId: user._id,
 *   ip: req.ip,
 *   userAgent: req.headers['user-agent'],
 *   // ... many more fields
 * }
 *
 * // AFTER (using metadata builder):
 * const metadata = new AuditMetadataBuilder(req)
 *   .withUserInfo(user)
 *   .withEntityFields(bracket, {
 *     variableId: '_id',
 *     name: 'name',
 *     minValue: 'minValue',
 *     maxValue: 'maxValue',
 *     rate: 'rate',
 *   })
 *   .withChangeTracking(changes)
 *   .build()
 *
 * HOW TO USE FOR OTHER ENTITIES:
 * 1. Create builder instance: new AuditMetadataBuilder(req)
 * 2. Chain methods: withUserInfo(), withRequestInfo(), withEntityFields(), withChangeTracking()
 * 3. Call build() to get the final metadata object
 * 4. Pass metadata to logAuditEvent()
 */

/**
 * Audit Metadata Builder Class
 *
 * Provides a fluent interface for building audit metadata
 */
class AuditMetadataBuilder {
  constructor(req) {
    this.req = req;
    this.metadata = {};
  }

  /**
   * Adds user information to metadata
   *
   * USAGE:
   * .withUserInfo(user)
   * // Adds: userId, userName, userRole, userEmail
   *
   * @param {object} user - User object from database or userInfo object with name/email
   * @returns {AuditMetadataBuilder} - Builder instance for chaining
   */
  withUserInfo(user) {
    if (user) {
      // Handle both full user object and userInfo format
      if (user.name) {
        // userInfo format from getUserInfo()
        this.metadata.userName = user.name;
        this.metadata.userEmail = user.email;
      } else {
        // Full user object from database
        this.metadata.userName =
          `${user.firstName || ""} ${user.lastName || ""}`.trim();
        this.metadata.userEmail = user.email;
      }
      this.metadata.userId = user._id;
      this.metadata.userRole = user.role;
    }
    return this;
  }

  /**
   * Adds request information to metadata
   *
   * USAGE:
   * .withRequestInfo()
   * // Adds: ip, method, path
   *
   * @returns {AuditMetadataBuilder} - Builder instance for chaining
   */
  withRequestInfo() {
    if (this.req) {
      this.metadata.ip = this.req.ip || "unknown";
      this.metadata.method = this.req.method;
      this.metadata.path = this.req.path;
    }
    return this;
  }

  /**
   * Adds entity fields to metadata
   *
   * USAGE:
   * .withEntityFields(entity, {
   *   variableId: '_id',
   *   name: 'name',
   *   minValue: 'minValue',
   * })
   * // Adds: variableId, name, minValue from entity object
   *
   * @param {object} entity - Entity object from database
   * @param {object} fieldMapping - Object mapping metadata field to entity field
   * @returns {AuditMetadataBuilder} - Builder instance for chaining
   */
  withEntityFields(entity, fieldMapping) {
    if (entity && fieldMapping) {
      for (const [metadataField, entityField] of Object.entries(fieldMapping)) {
        this.metadata[metadataField] = entity[entityField];
      }
    }
    return this;
  }

  /**
   * Adds change tracking information to metadata
   *
   * USAGE:
   * .withChangeTracking(changes)
   * // Adds: changedFields, changeCount, changeSummary
   *
   * @param {Array<object>} changes - Array of change objects from trackChanges
   * @returns {AuditMetadataBuilder} - Builder instance for chaining
   */
  withChangeTracking(changes) {
    if (changes && Array.isArray(changes)) {
      const changedFields = changes.filter((c) => c.changed);
      this.metadata.changedFields = changedFields.map((c) => c.field);
      this.metadata.changeCount = changedFields.length;

      // Add change summary for easy reading
      const summary = changedFields
        .map((c) => `${c.field}: ${c.oldValue} -> ${c.newValue}`)
        .join(", ");
      this.metadata.changeSummary = summary || "No changes";
    }
    return this;
  }

  /**
   * Adds custom fields to metadata
   *
   * USAGE:
   * .withCustomFields({ customField: 'value', anotherField: 123 })
   *
   * @param {object} fields - Object with custom fields to add
   * @returns {AuditMetadataBuilder} - Builder instance for chaining
   */
  withCustomFields(fields) {
    if (fields) {
      Object.assign(this.metadata, fields);
    }
    return this;
  }

  /**
   * Adds timestamp to metadata
   *
   * USAGE:
   * .withTimestamp()
   * // Adds: timestamp (ISO string)
   *
   * @returns {AuditMetadataBuilder} - Builder instance for chaining
   */
  withTimestamp() {
    this.metadata.timestamp = new Date().toISOString();
    return this;
  }

  /**
   * Adds entity type and ID to metadata
   *
   * USAGE:
   * .withEntityIdentification('Variable', '123')
   * // Adds: entityType, entityId
   *
   * @param {string} entityType - Type of entity (e.g., 'Variable', 'Fee')
   * @param {string} entityId - ID of the entity
   * @returns {AuditMetadataBuilder} - Builder instance for chaining
   */
  withEntityIdentification(entityType, entityId) {
    this.metadata.entityType = entityType;
    this.metadata.entityId = entityId;
    return this;
  }

  /**
   * Adds full entity snapshots to metadata
   *
   * USAGE:
   * .withEntitySnapshots(oldEntity, newEntity)
   * // Adds: oldSnapshot, newSnapshot (stringified JSON)
   *
   * @param {object} oldEntity - Entity object before changes (null for create)
   * @param {object} newEntity - Entity object after changes (null for delete)
   * @returns {AuditMetadataBuilder} - Builder instance for chaining
   */
  withEntitySnapshots(oldEntity, newEntity) {
    if (oldEntity) {
      // Convert Mongoose document to plain object to avoid internal properties
      const plainOld = oldEntity.toObject ? oldEntity.toObject() : oldEntity;
      this.metadata.oldSnapshot = JSON.stringify(plainOld);
    }
    if (newEntity) {
      // Convert Mongoose document to plain object to avoid internal properties
      const plainNew = newEntity.toObject ? newEntity.toObject() : newEntity;
      this.metadata.newSnapshot = JSON.stringify(plainNew);
    }
    return this;
  }

  /**
   * Builds the final metadata object
   *
   * USAGE:
   * const metadata = builder.build()
   *
   * @returns {object} - Complete metadata object
   */
  build() {
    return { ...this.metadata };
  }
}

/**
 * Convenience function to create a builder with common fields
 *
 * USAGE:
 * const metadata = buildAuditMetadata(req, user, entity, {
 *   variableId: '_id',
 *   name: 'name',
 * })
 *
 * @param {object} req - Express request object
 * @param {object} user - User object
 * @param {object} entity - Entity object
 * @param {object} fieldMapping - Field mapping for entity fields
 * @param {object} options - Additional options
 * @returns {object} - Complete metadata object
 */
function buildAuditMetadata(req, user, entity, fieldMapping, options = {}) {
  const { entityType, entityId, changes } = options;

  const builder = new AuditMetadataBuilder(req)
    .withUserInfo(user)
    .withRequestInfo()
    .withEntityFields(entity, fieldMapping)
    .withTimestamp();

  if (entityType && entityId) {
    builder.withEntityIdentification(entityType, entityId);
  }

  if (changes) {
    builder.withChangeTracking(changes);
  }

  return builder.build();
}

module.exports = {
  AuditMetadataBuilder,
  buildAuditMetadata,
};
