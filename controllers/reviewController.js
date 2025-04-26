const Review = require('../models/Review');
const University = require('../models/University');
const Branch = require('../models/Branches');
const User = require('../models/User');

exports.createReview = async (req, res) => {
  try {
    const { universityId, branchId } = req.params;
    const userId = req.body.userId;

    const user = await User.findById(userId);
    if (!user.isEmailVerified) {
      return res.status(403).json({ error: 'Please verify your email before leaving a review' });
    } else if (user.role === 'admin') {
      return res.status(403).json({ error: "You're an admin, sorry." });
    }

    const universityEntry = user.universities.find(u => u.university.toString() === universityId && u.isVerified);
    if (!universityEntry) {
      return res.status(403).json({ error: 'Please verify your school email for this university before leaving a review' });
    }

    // Check if a review already exists
    const existingReview = await Review.findOne({ user_id: userId, university: universityId, branch: branchId });
    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this university.' });
    }

    const { 
      academic_rating,
      facilities_rating,
      social_life_rating,
      career_prospects_rating,
      cost_of_living,
      comment
    } = req.body;

    // Validate and convert ratings to numbers
    const academicRating = parseInt(academic_rating, 10);
    const facilitiesRating = parseInt(facilities_rating, 10);
    const socialLifeRating = parseInt(social_life_rating, 10);
    const careerProspectsRating = parseInt(career_prospects_rating, 10);

    // Ensure ratings are within valid range (1-10)
    if (
      isNaN(academicRating) || academicRating < 1 || academicRating > 10 ||
      isNaN(facilitiesRating) || facilitiesRating < 1 || facilitiesRating > 10 ||
      isNaN(socialLifeRating) || socialLifeRating < 1 || socialLifeRating > 10 ||
      isNaN(careerProspectsRating) || careerProspectsRating < 1 || careerProspectsRating > 10
    ) {
      return res.status(400).json({ error: 'Ratings must be numbers between 1 and 10' });
    }

    // Calculate overall rating
    const added = academicRating + facilitiesRating + socialLifeRating + careerProspectsRating;
    const overallRating = added / 4;

    // Create a new review
    const review = new Review({
      user_id: userId,
      university: universityId,
      branch: branchId,
      academic_rating: academicRating,
      facilities_rating: facilitiesRating,
      social_life_rating: socialLifeRating,
      career_prospects_rating: careerProspectsRating,
      cost_of_living,
      comment,
      overall_rating: overallRating,
      date: new Date()
    });

    await review.save();

    // Update university ratings
    const university = await University.findById(universityId);
    const reviews = await Review.find({ university: universityId });
    university.academic_rating = calculateAverage(reviews, 'academic_rating');
    university.facilities_rating = calculateAverage(reviews, 'facilities_rating');
    university.social_life_rating = calculateAverage(reviews, 'social_life_rating');
    university.career_prospects_rating = calculateAverage(reviews, 'career_prospects_rating');
    university.cost_of_living = calculateAverage(reviews, 'cost_of_living');
    university.overall_rating = calculateOverallRating(university);

    // Update branch ratings
    const branch = await Branch.findById(branchId);
    const branchReviews = await Review.find({ university: universityId, branch: branchId });
    branch.academic_rating = calculateBranchAverage(branchReviews, 'academic_rating');
    branch.facilities_rating = calculateBranchAverage(branchReviews, 'facilities_rating');
    branch.social_life_rating = calculateBranchAverage(branchReviews, 'social_life_rating');
    branch.career_prospects_rating = calculateBranchAverage(branchReviews, 'career_prospects_rating');
    branch.cost_of_living = calculateBranchAverage(branchReviews, 'cost_of_living');
    branch.overall_rating = calculateOverallBranchRating(branch);

    await branch.save();
    await university.save();

    res.status(201).json(review);
  } catch (err) {
    console.error('Error creating review:', err);
    res.status(400).json({ error: 'Failed to create review. Please try again.' });
  }
};

// Helper function to calculate average (unchanged)
function calculateAverage(reviews, field) {
  const sum = reviews.reduce((acc, review) => acc + review[field], 0);
  return reviews.length > 0 ? sum / reviews.length : 0;
}

function calculateBranchAverage(branchReviews, field) {
  const sum = branchReviews.reduce((acc, review) => acc + review[field], 0);
  return branchReviews.length > 0 ? sum / branchReviews.length : 0;
}

// Helper function to calculate overall rating as an average of other ratings
function calculateOverallRating(university) {
  const {
    academic_rating,
    facilities_rating,
    social_life_rating,
    career_prospects_rating,
  } = university;

  const sum = academic_rating + facilities_rating + social_life_rating + career_prospects_rating;
  return sum / 4;
}

function calculateOverallBranchRating(branch) {
  const {
    academic_rating,
    facilities_rating,
    social_life_rating,
    career_prospects_rating,
  } = branch;

  const sum = academic_rating + facilities_rating + social_life_rating + career_prospects_rating;
  return sum / 4;
}

exports.getReviews = async (req, res) => {
  try {
    const { universityId, branchId } = req.params;
    const reviews = await Review.find({ university: universityId, branch: branchId }).populate('user_id', 'username');
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUniReviews = async (req, res) => {
  try {
    const { universityId } = req.params;
    const reviews = await Review.find({ university: universityId}).populate('user_id', 'username');
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addOrUpdateResponse = async (req, res) => {
  try {
    const { reviewId, userId, response } = req.body;
    console.log(reviewId, userId, response)

    const user = await User.findById(userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: "You aren't an admin, sorry." });
    }

    const review = await Review.findByIdAndUpdate(reviewId, {
      $push: { responses: { user_id: userId, response: response } },
    }, { new: true });

    console.log('added', review);

    res.json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
