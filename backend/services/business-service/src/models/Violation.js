const mongoose = require('mongoose')
const { encryptionPlugin } = require('../../../../shared/lib/encryptionPlugin')

const violationSchema = new mongoose.Schema({
  code: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  severity: {
    type: String,
    required: true,
    enum: ['minor', 'major', 'critical']
  },
  legalBasis: [{
    _id: false,
    url: { type: String, trim: true },
    title: { type: String, trim: true },
    description: { type: String, trim: true }
  }],
  correctiveAction: {
    type: String,
    trim: true
  },
  feeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fee',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  version: {
    type: Number,
    default: 1
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
})

violationSchema.plugin(encryptionPlugin, {
  fields: ['name', 'description', 'legalBasis.title', 'legalBasis.description', 'correctiveAction'],
  deterministicFields: ['code'],
  nestedPaths: ['legalBasis'],
  arrayPaths: [],
  mixedPaths: [],
})

violationSchema.index({ category: 1 })
violationSchema.index({ severity: 1 })
violationSchema.index({ isActive: 1 })

module.exports = mongoose.model('Violation', violationSchema)
