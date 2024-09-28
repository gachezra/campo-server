const mongoose = require('mongoose');
const { Schema } = mongoose;

const forumPostSchema = new Schema({
  threadId: { type: Schema.Types.ObjectId, ref: 'ForumThread', required: true },
  content: { type: String, required: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  parentId: { type: Schema.Types.ObjectId, ref: 'ForumPost', default: null },
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 },
  upvotedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  downvotedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ForumPost', forumPostSchema);