const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  university: { type: mongoose.Schema.Types.ObjectId, ref: 'University' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  overall_rating: { "type": Number, required: true },
  academic_rating: { "type": Number },
  facilities_rating: { "type": Number },
  social_life_rating: { "type": Number },
  career_prospects_rating: { "type": Number },
  cost_of_living: { "type": Number },
  comment: { type: String },
  responses: {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    response: { type: String }
  },
  date: { type: Date, default: Date.now }
});

// Create a unique compound index on user_id and university_id
ReviewSchema.index({ user_id: 1, university_id: 1, branch: 1  }, { unique: true });

module.exports = mongoose.model('Review', ReviewSchema);
