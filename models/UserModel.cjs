const mongoose = require('mongoose');

const UserModel = new mongoose.Schema(
  {
    key: { type: String, required: true },
    name: { type: String },
    profile_img: { type: String },
    age: { type: Number },
    completed_profile: { type: Boolean, default: false },
    liked: [{ type: String }],
    shared: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', UserModel);

module.exports = User;
