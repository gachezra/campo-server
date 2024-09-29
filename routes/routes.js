const express = require('express');
const router = express.Router();
const universityController = require('../controllers/universityController');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');
const forumController = require('../controllers/forumController');
const { protect, authorize } = require('../middleware/auth');

// Auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.put('/update/:userId', protect, authController.updateUser);
router.post('/school-email', protect, authController.addUniversityAndSchoolEmail);
router.post('/verify-email/:token', authController.verifyEmail);
router.get('/profile/:userId', protect, authController.getUser);
router.post('/setAvatar/:userId', protect, authController.updateAvatarConfig);
router.post('/change-password/:token', authController.resetPassword);
router.post('/request-password-reset', authController.requestPasswordReset);
router.post('/sendMessage', authController.sendMessage);

// University routes
router.get('/universities', universityController.getUniversities);
router.get('/dropdown-universities', universityController.getAllUniversitiesForDropdown);
router.get('/universities/:id', universityController.getUniversityById);
router.post('/universities', protect, authorize('admin'), universityController.createUniversity);
router.post('/universities/:id/images', protect, authorize('admin'), universityController.addImageToGallery);

// Branches routes
router.post('/branches/:universityId/:userId/add', protect, universityController.addBranchToUniversity);
router.post('/branches/:branchId/:userId/update', protect, universityController.updateBranch);
router.get('/branch-programs/:branchId', universityController.getProgramsByBranch);
router.get('/branches/:universityId/branches', universityController.getBranchesByUniversity);
router.get('/universities/:branchId/branch', universityController.getBranchByUniversity);

// Review routes
router.post('/reviews/:universityId/:branchId', protect, reviewController.createReview);
router.get('/reviews/:universityId/:branchId', reviewController.getReviews);
router.post('/reviews/response', protect, reviewController.addOrUpdateResponse);

//Forum routes
// Thread Routes
router.post('/threads/:userId', forumController.createThread); // Create a new thread
router.put('/threads/:threadId', forumController.editThread); // Edit a thread
router.delete('/threads/:threadId', forumController.deleteThread); // Delete a thread
router.get('/threads/:userId', forumController.getThreads); // Get all threads
router.get('/threads/:threadId', forumController.getThreadById); // Get a specific thread by ID

// Post Routes
router.post('/posts/:userId', forumController.createPost); // Create a new post or reply
router.put('/posts/:postId', forumController.editPost); // Edit a post
router.delete('/posts/:postId', forumController.deletePost); // Delete a post and its replies
router.get('/threads/:userId/:threadId/posts', forumController.getPostsForThread); // Get all posts for a specific thread

// Voting Routes
router.post('/posts/:postId/vote', forumController.votePost); // Upvote or downvote a post



module.exports = router;