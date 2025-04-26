const University = require('../models/University');
const Review = require('../models/Review');
const Branch = require('../models/Branches');
const User = require('../models/User');

exports.getUniversities = async (req, res) => {
  try {
    const { search, sort, page = 1, limit = 10 } = req.query;
    const query = search ? { $text: { $search: search } } : {};
    const sortOption = sort ? { [sort]: 1 } : { name: 1 };

    const universities = await University.find(query)
      .sort(sortOption)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await University.countDocuments(query);

    res.json({
      universities,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUniversityById = async (req, res) => {
  try {
    const university = await University.findById(req.params.id)
      .populate('branches', 'name location programs_offered');
    
    if (!university) return res.status(404).json({ error: 'University not found' });
    
    const reviews = await Review.find({ university_id: req.params.id })
      .populate('user_id', 'username')
      .exec();
    
    const universityWithReviews = {
      ...university.toObject(),
      reviews: reviews
    };
    
    res.json(universityWithReviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createUniversity = async (req, res) => {
  try {
    // Check if the user is an admin
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { name, description, website, emailDomain, branches } = req.body;

    // Create a new university
    const newUniversity = new University({
      name,
      description,
      website,
      emailDomain
    });

    // In createUniversity:
    if (branches && Array.isArray(branches)) {
      const branchDocuments = await Branch.create(branches);
      newUniversity.branches = branchDocuments.map(branch => branch._id);
    }


    const savedUniversity = await newUniversity.save();
    res.status(201).json(savedUniversity);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.addBranchToUniversity = async (req, res) => {
  try {
    // Check if the user is an admin
    const user = await User.findById(req.params.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { universityId } = req.params;
    const branchData = req.body;

    // Find the university
    const university = await University.findById(universityId);
    if (!university) {
      return res.status(404).json({ error: 'University not found' });
    }

    // Create a new branch
    const newBranch = await Branch.create(branchData);

    // Add the new branch to the university
    university.branches.push(newBranch._id);
    await university.save();

    res.status(201).json(newBranch);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateBranch = async (req, res) => {
  try {
    // Check if the user is an admin
    const user = await User.findById(req.params.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { branchId } = req.params;
    const branchData = req.body;

    // Find the branch by ID
    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    // Update the branch data
    Object.assign(branch, branchData);

    // Save the updated branch
    const updatedBranch = await branch.save();

    res.json(updatedBranch);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateUniversity = async (req, res) => {
  try {
    // Check if the user is an admin
    const user = await User.findById(req.params.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Find the university by ID
    const university = await University.findById(req.params.universityId);
    if (!university) return res.status(404).json({ error: 'University not found' });

    // Update the university with the request body
    Object.assign(university, req.body);
    const updatedUniversity = await university.save();
    res.json(updatedUniversity);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.addImageToGallery = async (req, res) => {
  try {
    const university = await University.findById(req.params.id);
    if (!university) return res.status(404).json({ error: 'University not found' });

    university.image_gallery.push(req.body.image_url);
    const updatedUniversity = await university.save();
    res.json(updatedUniversity);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getAllUniversitiesForDropdown = async (req, res) => {
  try {
    const universities = await University.find({}, 'name').sort({ name: 1 });
    res.json(universities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getBranchesByUniversity = async (req, res) => {
  try {
    const { universityId } = req.params;

    const university = await University.findById(universityId).populate('branches');

    if (!university) {
      return res.status(404).json({ message: 'University not found' });
    }

    const branches = university.branches.map(branch => ({
      _id: branch._id,
      name: branch.name,
      contact:branch.contact,
      programs_offered: branch.programs_offered,
      location: branch.location,
      image_gallery: branch.image_gallery
    }));

    res.status(200).json(branches);
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

exports.getBranchByUniversity = async (req, res) => {
  try {
    const { branchId } = req.params;

    const branch = await Branch.findById(branchId)

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    const branchResponse = {
      _id: branch._id,
      name: branch.name,
      location: branch.location,
      overall_rating: branch.overall_rating,
      academic_rating: branch.academic_rating,
      facilities_rating: branch.facilities_rating,
      social_life_rating: branch.social_life_rating,
      career_prospects_rating: branch.career_prospects_rating,
      cost_of_living: branch.cost_of_living,
      programs_offered: branch.programs_offered,
      image_gallery: branch.image_gallery,
      students: branch.students
    };
    

    res.status(200).json(branchResponse);

  } catch (error) {
    console.error('Error fetching branch deets:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

exports.getProgramsByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;

    // Find the university branch by ID
    const branch = await Branch.findById(branchId);

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    // Send the programs offered by the branch
    res.status(200).json(branch.programs_offered);
  } catch (error) {
    console.error('Error fetching programs:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

exports.getStudentsByUniversity = async (req, res) => {
  try {
    const { universityId } = req.params;

    const users = await User.find({
      'universities': {
        $elemMatch: {
          university: universityId,
          isVerified: true
        }
      }
    });

    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};
