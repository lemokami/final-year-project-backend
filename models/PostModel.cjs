const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const PostModel = new Schema(
  {
    path: { type: String, required: true },
    likes: { type: Number, default: 0 },
    shareable: { type: Boolean, required: true },
    metaHash: { type: String, required: true },
    metaContentHash: { type: String, required: true },
    owner: { type: String, required: true },
    tid: { type: String },
  },
  {
    timestamps: true,
  }
);

const Post = mongoose.model('Post', PostModel);

module.exports = Post;
