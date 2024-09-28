const ForumThread = require('../models/forumThreadModel');
const ForumPost = require('../models/forumPostModel');
const User = require('../models/User');

// Create a new thread
exports.createThread = async (req, res) => {
  try {
    const { title, content, branchId } = req.body;
    const author = req.params.userId;
    // console.log('Creating thread: ',title,content,branchId, 'By author: ',author)

    // Check if the user is an admin
    const user = await User.findById(author);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create threads' });
    }

    const newThread = new ForumThread({
      title,
      content,
      branch: branchId,
      author,
    });
    const savedThread = await newThread.save();
    res.status(201).json(savedThread);
  } catch (error) {
    res.status(500).json({ message: 'Error creating thread', error });
  }
};

// Edit a thread
exports.editThread = async (req, res) => {
  try {
    const { threadId } = req.params;
    const { title, content } = req.body;

    const updatedThread = await ForumThread.findByIdAndUpdate(
      threadId,
      { title, content },
      { new: true }
    );

    if (!updatedThread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    res.status(200).json(updatedThread);
  } catch (error) {
    res.status(500).json({ message: 'Error editing thread', error });
  }
};

// Delete a thread (including all associated posts)
exports.deleteThread = async (req, res) => {
  try {
    const { threadId } = req.params;

    const deletedThread = await ForumThread.findByIdAndDelete(threadId);
    if (!deletedThread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    // Delete all posts associated with this thread
    await ForumPost.deleteMany({ threadId });

    res.status(200).json({ message: 'Thread and associated posts deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting thread', error });
  }
};

// Create a new post (or reply)
exports.createPost = async (req, res) => {
  try {
    const { threadId, content, parentId } = req.body;
    const author = req.params.userId;
    // console.log(threadId, content, parentId, author);

    // Check if the user has access to this thread
    const thread = await ForumThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    const user = await User.findById(author).populate('universities');
    const userBranches = user.universities.map(uni => uni.branch.toString());
    
    if (!userBranches.includes(thread.branch.toString())) {
      return res.status(403).json({ message: 'You do not have access to this thread' });
    }

    const newPost = new ForumPost({
      threadId,
      content,
      author,
      parentId: parentId || null,
    });
    const savedPost = await newPost.save();

    // Add the new post to the thread's posts array
    thread.posts.push(savedPost._id);
    await thread.save();

    res.status(201).json(savedPost);
  } catch (error) {
    res.status(500).json({ message: 'Error creating post', error });
  }
};

// Edit a post
exports.editPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;

    const updatedPost = await ForumPost.findByIdAndUpdate(
      postId,
      { content },
      { new: true }
    );

    if (!updatedPost) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.status(200).json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: 'Error editing post', error });
  }
};

// Delete a post (including nested replies)
exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.params;

    const deletedPost = await ForumPost.findByIdAndDelete(postId);
    if (!deletedPost) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Delete all nested replies associated with this post
    await ForumPost.deleteMany({ parentId: postId });

    res.status(200).json({ message: 'Post and associated replies deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting post', error });
  }
};

// Fetch all posts for a thread (with nesting logic)
exports.getPostsForThread = async (req, res) => {
  try {
    const { threadId } = req.params;
    const userId = req.params.userId;

    // Check if the user has access to this thread
    const thread = await ForumThread.findById(threadId).populate('posts');
    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    const user = await User.findById(userId).populate('universities');
    const userBranches = user.universities.map(uni => uni.branch.toString());
    
    if (!userBranches.includes(thread.branch.toString())) {
      return res.status(403).json({ message: 'You do not have access to this thread' });
    }

    const posts = await ForumPost.find({ _id: { $in: thread.posts } })
      .populate('author', 'username')
      .sort({ createdAt: 1 });

    // Helper function to build nested structure recursively
    const buildNestedPosts = (parentId = null) => {
      return posts
        .filter(post => String(post.parentId) === String(parentId))
        .map(post => ({
          ...post._doc,
          replies: buildNestedPosts(post._id) // Recursively find nested replies
        }));
    };

    // Get top-level posts (where parentId is null) and build the nested structure
    const nestedPosts = buildNestedPosts();

    res.status(200).json(nestedPosts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching posts', error });
  }
};


// Upvote or downvote a post
exports.votePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { vote, userId } = req.body;

    const post = await ForumPost.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (vote === 'upvote') {
      if (post.upvotedBy.includes(userId)) {
        return res.status(400).json({ message: 'User has already upvoted this post' });
      }

      // Remove userId from downvotedBy if they are switching votes
      await ForumPost.findByIdAndUpdate(postId, {
        $pull: { downvotedBy: userId },
        $inc: { downvotes: post.downvotedBy.includes(userId) ? -1 : 0 },
      });

      // Register the upvote
      post.upvotes += 1;
      post.upvotedBy.push(userId);
      
    } else if (vote === 'downvote') {
      if (post.downvotedBy.includes(userId)) {
        return res.status(400).json({ message: 'User has already downvoted this post' });
      }

      // Remove userId from upvotedBy if they are switching votes
      await ForumPost.findByIdAndUpdate(postId, {
        $pull: { upvotedBy: userId },
        $inc: { upvotes: post.upvotedBy.includes(userId) ? -1 : 0 },
      });

      // Register the downvote
      post.downvotes += 1;
      post.downvotedBy.push(userId);
    }

    const updatedPost = await post.save();
    res.status(200).json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: 'Error voting on post', error });
  }
};

// Get all threads
exports.getThreads = async (req, res) => {
  try {
    const userId = req.params.userId; // Assuming you have user info in the request
    
    // Get the user's branch
    const user = await User.findById(userId).populate('universities');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userBranches = user.universities.map(uni => uni.branch);

    // Fetch threads for the user's branches
    const threads = await ForumThread.find({ branch: { $in: userBranches } })
      .populate('author', 'username')
      .populate('branch', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json(threads);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching threads', error });
  }
};

// Get a specific thread by ID
exports.getThreadById = async (req, res) => {
  try {
    const { threadId } = req.params;
    const userId = req.user.id;

    const thread = await ForumThread.findById(threadId)
      .populate('author', 'username')
      .populate('branch', 'name');
    
    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    // Check if the user has access to this thread
    const user = await User.findById(userId).populate('universities');
    const userBranches = user.universities.map(uni => uni.branch.toString());
    
    if (!userBranches.includes(thread.branch._id.toString())) {
      return res.status(403).json({ message: 'You do not have access to this thread' });
    }

    res.status(200).json(thread);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching thread', error });
  }
};
