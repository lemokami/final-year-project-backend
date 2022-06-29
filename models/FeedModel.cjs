const { default: mongoose, Schema } = require('mongoose');

const FeedModel = Schema(
  {
    post: { type: Schema.Types.ObjectId, ref: 'Post' },
    likes: { type: Number, default: 0 },
    isOwner: { type: Boolean, required: true },
    poster: { type: Schema.Types.ObjectId, ref: 'User' },
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

const Feed = mongoose.model('Feed', FeedModel);

module.exports = Feed;
