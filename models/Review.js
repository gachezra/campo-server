const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  university: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  overall_rating: { type: Number, required: true, min: 1, max: 10 },
  academic_rating: { type: Number, required: true, min: 1, max: 10 },
  facilities_rating: { type: Number, required: true, min: 1, max: 10 },
  social_life_rating: { type: Number, required: true, min: 1, max: 10 },
  career_prospects_rating: { type: Number, required: true, min: 1, max: 10 },
  cost_of_living: { type: Number, required: true, min: 1 },
  comment: { type: String, required: true },
  responses: [{
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    response: { type: String, required: true },
    date: { type: Date, default: Date.now }
  }],
  date: { type: Date, default: Date.now }
});

// Create a unique compound index on user_id, university, and branch
ReviewSchema.index({ user_id: 1, university: 1, branch: 1 }, { unique: true });

module.exports = mongoose.model('Review', ReviewSchema);
