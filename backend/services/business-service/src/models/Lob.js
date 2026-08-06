const mongoose = require('mongoose')
const { encryptionPlugin } = require('../../../../shared/lib/encryptionPlugin')

const lobSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    immutable: true,
  },
  name: {
    type: String,
    required: true,
    immutable: true,
  },
  description: {
    type: String,
    required: true,
  },
  notes: {
    type: String,
    required: false,
  },
  category: {
    type: String,
    required: true,
    immutable: true,
  },
  lineOfBusiness: {
    type: String,
    required: true,
    immutable: true,
  },
  variables: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Variable',
    default: [],
  },
  documents: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'ClaimableDocument',
    default: [],
  },
  postRequirements: {
    required: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'PostRequirement',
      default: [],
    },
    conditional: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'PostRequirement',
      default: [],
    },
  },
  essentialCommodity: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'disabled'],
    default: 'draft',
  },
  disabledDate: {
    type: Date,
    default: null,
  },
  disabledReason: {
    type: String,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  version: {
    type: Number,
    default: 1,
  },
}, {
  timestamps: true,
})

lobSchema.plugin(encryptionPlugin, {
  fields: ['name', 'description', 'notes'],
  deterministicFields: [],
  nestedPaths: [],
  arrayPaths: [],
  mixedPaths: [],
})

module.exports = mongoose.model('Lob', lobSchema)
