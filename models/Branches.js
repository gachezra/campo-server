const mongoose = require('mongoose');

const BranchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  contact: { type: String},
  email: { type: String},
  website: { type: String},
  description: { type: String },
  overall_rating: { type: Number, default: 0 },
  academic_rating: { type: Number, default: 0 },
  facilities_rating: { type: Number, default: 0 },
  social_life_rating: { type: Number, default: 0 },
  career_prospects_rating: { type: Number, default: 0 },
  cost_of_living: { type: Number, default: 0 },
  programs_offered: [String],
  image_gallery: [String],
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

BranchSchema.index({ name: 'text', location: 'text', programs_offered: 'text' });

module.exports = mongoose.model('Branch', BranchSchema);