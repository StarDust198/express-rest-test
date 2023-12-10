const { expect } = require('chai');
// const sinon = require('sinon');
const mongoose = require('mongoose');

const User = require('../models/user');
// const Post = require('../models/post');
const FeedController = require('../controllers/feed');

const { mongoPassword: password } = require('../.env');
const MONGODB_TESTING_URI = `mongodb+srv://roadtomars2030:${password}@cluster0.6j6n0va.mongodb.net/test-messages?retryWrites=true&w=majority`;

describe('Feed Controller', () => {
  before((done) => {
    mongoose
      .connect(MONGODB_TESTING_URI)
      .then((result) => {
        const user = new User({
          email: 'test@test.com',
          password: 'Test123',
          name: 'Test',
          posts: [],
          _id: '5c0f66b979af55031b34728a',
        });

        return user.save();
      })
      .then(() => {
        done();
      });
  });

  it('should send a response with a valid user status for an existing user', (done) => {
    const req = { userId: '5c0f66b979af55031b34728a' };
    const res = {
      statusCode: 500,
      userStatus: null,
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (data) {
        this.userStatus = data.status;
      },
    };

    FeedController.getStatus(req, res, () => {})
      .then(() => {
        expect(res.statusCode).to.be.equal(200);
        expect(res.userStatus).to.be.equal('I am new!');

        done();
      })
      .catch((err) => {
        console.log(err);
      });
  });

  it('should add a created post to the posts of the creator', (done) => {
    const req = {
      userId: '5c0f66b979af55031b34728a',
      body: {
        title: 'Test Post',
        content: 'A Test Post',
      },
      file: {
        path: 'abc',
      },
    };
    const res = {
      status: function () {
        return this;
      },
      json: function () {},
    };

    FeedController.createPost(req, res, () => {})
      .then((savedUser) => {
        expect(savedUser).to.have.property('posts');
        expect(savedUser.posts).to.have.length(1);
        done();
      })
      .catch((err) => {
        console.log(err);
      });
  });

  after((done) => {
    User.deleteMany({})
      .then(() => {
        return mongoose.disconnect();
      })
      .then(() => {
        done();
      });
  });
});
