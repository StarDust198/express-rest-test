const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const Post = require('../models/post');

const { clearImage } = require('../util/file');
const { JWT_SECRET } = require('../consts');

module.exports = {
  createUser: async function ({ userInput }, req) {
    const { email, name, password } = userInput;
    const errors = [];
    if (!validator.isEmail(email))
      errors.push({ message: 'Email is invalid.' });
    if (
      validator.isEmpty(password) ||
      !validator.isLength(password, { min: 5 })
    )
      errors.push({ message: 'Password is too short' });

    if (errors.length > 0) {
      const error = new Error('Invalid input');
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error = new Error('User already exists!');
      throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      email,
      name,
      password: hashedPassword,
    });

    const createdUser = await user.save();

    return {
      ...createdUser._doc,
      _id: createdUser._id.toString(),
    };
  },

  login: async function ({ email, password }) {
    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error('User not found.');
      error.code = 401;
      throw error;
    }

    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error('Password is incorrect.');
      error.code = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      JWT_SECRET,
      {
        expiresIn: '1h',
      }
    );

    return { token, userId: user._id.toString() };
  },

  createPost: async function ({ postInput }, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    const { title, content, imageUrl } = postInput;
    const errors = [];

    if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 }))
      errors.push({ message: 'Title is too short.' });
    if (validator.isEmpty(imageUrl))
      errors.push({ message: 'Image required.' });
    if (validator.isEmpty(content) || !validator.isLength(content, { min: 5 }))
      errors.push({ message: 'Post content is too short.' });

    if (errors.length > 0) {
      const error = new Error('Invalid input');
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error('User is not in the database');
      error.code = 401;
      throw error;
    }

    const post = new Post({
      title,
      content,
      imageUrl,
      creator: user,
    });

    const createdPost = await post.save();
    user.posts.push(createdPost);
    await user.save();

    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString(),
    };
  },

  posts: async function ({ page }, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    if (!page) {
      page = 1;
    }
    const perPage = 2;

    const totalPosts = await Post.find().countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate('creator');

    return {
      totalPosts,
      posts: posts.map((post) => {
        return {
          ...post._doc,
          _id: post._id.toString(),
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString(),
        };
      }),
    };
  },

  getPost: async function ({ postId }, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(postId).populate('creator');
    if (!post) {
      const error = new Error('Post not found!');
      error.code = 404;
      throw error;
    }

    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  },

  editPost: async function ({ postId, postInput }, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    const { title, content, imageUrl } = postInput;

    const errors = [];
    if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 }))
      errors.push({ message: 'Title is too short.' });
    if (validator.isEmpty(imageUrl))
      errors.push({ message: 'Image required.' });
    if (validator.isEmpty(content) || !validator.isLength(content, { min: 5 }))
      errors.push({ message: 'Post content is too short.' });

    if (errors.length > 0) {
      const error = new Error('Invalid input');
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const post = await Post.findById(postId).populate('creator');

    if (!post) {
      const error = new Error('Post not found');
      error.code = 404;
      throw error;
    }

    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error('Editing forbidden');
      error.code = 403;
      throw error;
    }

    post.title = title;
    post.content = content;
    if (imageUrl !== 'undefined') {
      post.imageUrl = imageUrl;
    }

    const updatedPost = await post.save();

    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString(),
    };
  },

  deletePost: async function ({ postId }, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(postId);

    if (!post) {
      const error = new Error('Post not found');
      error.code = 404;
      throw error;
    }

    if (post.creator.toString() !== req.userId.toString()) {
      const error = new Error('Deleting forbidden');
      error.code = 403;
      throw error;
    }

    clearImage(post.imageUrl);
    await post.deleteOne();
    const user = await User.findById(req.userId);
    user.posts.pull(postId);
    await user.save();

    return true;
  },

  getUser: async function (_, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error('User is not in the database');
      error.code = 401;
      throw error;
    }

    return {
      ...user._doc,
      _id: user._id.toString(),
    };
  },

  setStatus: async function ({ newStatus }, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    const errors = [];
    if (validator.isEmpty(newStatus))
      errors.push({ message: 'Status required.' });

    if (errors.length > 0) {
      const error = new Error('Invalid input');
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error('User is not in the database');
      error.code = 401;
      throw error;
    }

    user.status = newStatus;
    await user.save();

    return true;
  },
};
