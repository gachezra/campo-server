const mongoose = require('mongoose');

const UniversitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  website: { type: String },
  emailDomain: { type: String},
  overall_rating: { type: Number, default: 0 },
  academic_rating: { type: Number, default: 0 },
  facilities_rating: { type: Number, default: 0 },
  social_life_rating: { type: Number, default: 0 },
  career_prospects_rating: { type: Number, default: 0 },
  cost_of_living: { type: Number, default: 0 },
  branches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }]
});

module.exports = mongoose.model('University', UniversitySchema);