const mongoose = require('mongoose');

const PostModel = new mongoose.Schema({
  hash: { type: String, required: true },
  path: { type: String, required: true },
  likes: { type: Number, default: 0 },
  shareable: { type: Boolean, required: true },
  sharers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  owner: { type: Schema.Types.ObjectId, ref: 'User' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const Post = mongoose.model('Post', PostModel);

module.exports = Post;
