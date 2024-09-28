const User = require('../models/User');
const University = require('../models/University');
const Branch = require('../models/Branches');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const formData = require('form-data');
const dotenv = require('dotenv');
dotenv.config();
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: process.env.MAILGUN_USERNAME,
  key: process.env.MAILGUN_API,
  url: process.env.MAILGUN_URL
});

exports.sendVerificationEmail = async (user, universityIndex) => {
  try {
    const token = user.generateVerificationToken(universityIndex);
    await user.save();

    const mailOptions = {
      from: 'VarsityRank Team <noreply@pexmon.one>',
      to: universityIndex !== undefined ? user.universities[universityIndex].schoolEmail : user.email,
      subject: 'Email Verification',
      html: `
        <h1>Email Verification</h1>
        <p>Hello ${user.username},</p>
        <p>Please verify your ${universityIndex !== undefined ? 'school ' : ''}email by clicking the following link:</p>
        <a href="${process.env.APP_URL}/verify/${token}">Verify Email</a>
        <p>This link will expire in 1 hour.</p>
      `
    };

    await mg.messages.create('pexmon.one', mailOptions);
    // console.log(`${universityIndex !== undefined ? 'School email' : 'Email'} verification sent`);
  } catch (err) {
    console.error('Error sending verification email:', err.message);
  }
};

exports.sendPasswordResetLink = async (user) => {
  try {
    const token = user.generatePasswordResetToken();
    await user.save();

    const mailOptions = {
      from: 'VarsityRank Team <noreply@pexmon.one>',
      to: user.email,
      subject: 'Password Reset',
      html: `
        <h1>Password Reset</h1>
        <p>Hello ${user.username},</p>
        <p>You requested a password reset. Click the following link to reset your password:</p>
        <a href="${process.env.APP_URL}/reset/${token}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
      `
    };

    await mg.messages.create('pexmon.one', mailOptions);
    // console.log('Password reset link sent');
  } catch (err) {
    console.error('Error sending password reset link:', err.message);
  }
};

exports.register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Check if email or username is already taken
    const isTaken = await User.isEmailOrUsernameTaken(email, username);
    if (isTaken) {
      return res.status(400).json({ error: 'Email or username is already taken' });
    }
    
    const user = new User({ username, email, password, role });
    await user.save();
    
    // Send verification email
    await this.sendVerificationEmail(user);

    res.status(201).json({ message: 'Registration successful. Please check your email for verification. If not available in your inbox, check spam.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({
      $or: [
        { emailVerificationToken: token, emailVerificationExpires: { $gt: Date.now() } },
        { 'universities.verificationToken': token, 'universities.verificationExpires': { $gt: Date.now() } }
      ]
    });

    if (!user) return res.status(400).json({ error: 'Invalid or expired verification token' });
    
    if (user.emailVerificationToken === token) {
      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
    } else {
      const universityIndex = user.universities.findIndex(u => u.verificationToken === token);
      if (universityIndex !== -1) {
        user.universities[universityIndex].isVerified = true;
        user.universities[universityIndex].verificationToken = undefined;
        user.universities[universityIndex].verificationExpires = undefined;

        // Add user to the students array in the branch schema in the University model
        const university = await University.findById(user.universities[universityIndex].university).populate('branches');
        const branchId = user.universities[universityIndex].branch;

        const branch = await Branch.findById(branchId);

        // console.log(branch)

        if (branch) {
          branch.students.push(user._id);
          await university.save();
          await branch.save();
        } else {
          return res.status(404).json({ error: 'Branch not found' });
        }
      }
    }
    await user.save();
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await this.sendPasswordResetLink(user);
    res.json({ message: 'Password reset link sent to your email' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;
    // console.log(`reset password: ${newPassword} with token: ${token}`);
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ $or: [{ email }, { username: email }] });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    // Check if user is verified
    if (!user.isEmailVerified) {
      return res.status(403).json({ error: 'Email not verified. Please verify your email.' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    if (user.avatarImage.length === 0) {
      avatarSet = false;
    } else {
      avatarSet = true;
    }
    res.json({ token, id: user._id, role: user.role, university: user.universities.university, avatar: avatarSet});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports.updateUser = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    // console.log('Updating user', userId);
    const { username, email} = req.body;
    // Check if username or email is already used by another user
    const usernameCheck = await User.findOne({ username, _id: { $ne: userId } });
    if (usernameCheck) {
      return res.json({ message: "Username already used.", status: false });
    }
    const emailCheck = await User.findOne({ email, _id: { $ne: userId } });
    if (emailCheck) {
      return res.json({ message: "Email already used.", status: false });
    }

    // Update user data
    const updatedUser = { username, email };
    const userData = await User.findByIdAndUpdate(
      userId,
      updatedUser,
      { new: true }
    );

    return res.json({ status: true, user: userData });
  } catch (error) {
    next(error);
  }
};

exports.addUniversityAndSchoolEmail = async (req, res) => {
  try {
    const { universityId, schoolEmail, program, branchId } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const university = await University.findById(universityId);

    if (!university) {
      return res.status(404).json({ error: 'University not found' });
    }

    // Validate school email domain against university's domain
    const emailDomain = schoolEmail.split('@')[1];
    if (emailDomain !== university.emailDomain) {
      return res.status(400).json({ error: 'Invalid school email domain' });
    }

    // Check if this universityalready exists
    const existingUniversity = user.universities.find(u => 
      u.university.toString() === universityId
    );

    if (existingUniversity) {
      return res.status(400).json({ error: 'This university already exists' });
    }

    // Add new university entry
    const newUniversityEntry = {
      university: universityId,
      branch: branchId,
      schoolEmail,
      program,
      isVerified: false
    };

    user.universities.push(newUniversityEntry);
    await user.save();
    
    // Send verification email for school email
    await this.sendVerificationEmail(user, user.universities.length - 1);

    res.json({ message: 'University and school email added. Please check your email for verification.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
exports.addUniversityAdmin = async (req, res) => {
  try {
    const { universityId, schoolEmail, branch } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is an admin
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin users can add universities, branches, and admin emails' });
    }

    const university = await University.findById(universityId);

    if (!university) {
      // Create new university if it doesn't exist
      const newUniversity = new University({ name: universityName });
      await newUniversity.save();
      universityId = newUniversity._id;
    }

    // Validate school email domain against university's domain
    const emailDomain = schoolEmail.split('@')[1];
    if (emailDomain !== university.emailDomain) {
      return res.status(400).json({ error: 'Invalid school email domain' });
    }

    // Check if this university already exists
    const existingUniversity = user.universities.find(u => 
      u.university.toString() === universityId
    );

    if (existingUniversity) {
      return res.status(400).json({ error: 'This university already exists' });
    }

    // Add new university entry
    const newUniversityEntry = {
      university: universityId,
      schoolEmail,
      program,
      isVerified: false
    };

    user.universities.push(newUniversityEntry);
    await user.save();
    
    // Add new branch to the university
    const newBranch = { name: branchName };
    university.branches.push(newBranch);
    await university.save();
    
    // Send verification email for school email
    await this.sendVerificationEmail(user, user.universities.length - 1);

    res.json({ message: 'University, school email, and branch added. Please check your email for verification.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateAvatarConfig = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { newConfig } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if avatarImage array is empty, if so, add the new config
    if (user.avatarImage.length === 0) {
      user.avatarImage.push(newConfig);
    } else {
      // Update the existing config
      user.avatarImage[0] = newConfig;
    }

    await user.save();
    res.json({ message: 'Success'});
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}