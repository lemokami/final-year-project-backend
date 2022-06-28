const { Schema, model } = require('mongoose');

const PostModel = new Schema(
  {
    path: { type: String, required: true },
    likes: { type: Number, default: 0 },
    shareable: { type: Boolean, required: true },
    metaHash: { type: String, required: true },
    metaContentHash: { type: String, required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tid: { type: String },
    likedby: [{ type: String }],
    sharers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  {
    timestamps: true,
  }
);

const Post = model('Post', PostModel);

module.exports = Post;
