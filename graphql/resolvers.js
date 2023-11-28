const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const Post = require('../models/post');

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

    const { title, imageUrl, content } = postInput;
    const errors = [];

    if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 }))
      errors.push({ message: 'Title is too short.' });
    // if (validator.isEmpty(imageUrl)) errors.push({ message: 'No imageUrl.' });
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

    // const existingUser = await User.findOne({ email });
    // if (existingUser) {
    //   const error = new Error('User already exists!');
    //   throw error;
    // }
  },

  // getPosts: async function () {
  // 	const posts = await Post.find();

  // 	return posts.map(post => {
  // 		return {
  // 			_id: post._id.toString(),
  // 			title: post.title,
  // 			content: post.content,
  // 			imageUrl: 'imageUrl',
  // 			creator: User!
  // 			createdAt: String!
  // 			updatedAt: String!
  // 		}
  // 	});
  // },
};
