const { Schema, model } = require('mongoose');

const PostModel = new Schema(
  {
    path: { type: String, required: true },
    shareable: { type: Boolean, required: true },
    metaHash: { type: String, required: true },
    metaContentHash: { type: String, required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    caption: { type: String, required: true },
    tid: { type: String },
    sharers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    pid: { type: String, required: true },
    tx: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

const Post = model('Post', PostModel);

module.exports = Post;
