const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  avatarImage: [
    {
      sex: { type: String },
      faceColor: { type: String },
      earSize: { type: String },
      hairColor: { type: String },
      hairStyle: { type: String },
      hatColor: { type: String },
      hatStyle: { type: String },
      eyeStyle: { type: String },
      glassesStyle: { type: String },
      noseStyle: { type: String },
      mouthStyle: { type: String },
      shirtStyle: { type: String },
      shirtColor: { type: String },
      bgColor: { type: String }
    }
  ],
  isEmailVerified: { type: Boolean, default: false },
  password: { type: String, required: true },
  profile_picture: { type: String },
  role: { type: String, enum: ['user', 'verified_student', 'admin'], default: 'user' },
  universities: [{
    university: { type: mongoose.Schema.Types.ObjectId, ref: 'University' },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    schoolEmail: { type: String },
    isVerified: { type: Boolean, default: false },
    program: [{ type: String }],
    verificationToken: String,
    verificationExpires: Date
  }],
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date
});

UserSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

UserSchema.statics.isEmailOrUsernameTaken = async function (email, username) {
  const user = await this.findOne({ $or: [{ email }, { username }] });
  return !!user;
};

UserSchema.methods.generateVerificationToken = function(universityIndex) {
  const verificationToken = crypto.randomBytes(20).toString('hex');
  if (universityIndex !== undefined) {
    this.universities[universityIndex].verificationToken = verificationToken;
    this.universities[universityIndex].verificationExpires = Date.now() + 3600000; // Token expires in 1 hour
  } else {
    this.emailVerificationToken = verificationToken;
    this.emailVerificationExpires = Date.now() + 3600000; // Token expires in 1 hour
  }
  return verificationToken;
};

UserSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.passwordResetToken = resetToken;
  this.passwordResetExpires = Date.now() + 3600000; // Token expires in 1 hour
  return resetToken;
};

UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);