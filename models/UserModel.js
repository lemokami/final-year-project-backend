const mongoose = require('mongoose');

const UserModel = new mongoose.Schema({
  key: { type: String, required: true },
  name: { type: String },
  profile_img: { type: String },
  age: { type: Number },
  completed_profile: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date },
});

const User = mongoose.model('User', UserModel);

module.exports = User;
