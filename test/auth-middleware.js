const { expect } = require('chai');
const jwt = require('jsonwebtoken');
const sinon = require('sinon');

const authMiddleware = require('../middleware/is-auth');

describe('testing auth middleware', () => {
  it('should throw an error if no auth header present', () => {
    const req = {
      get: () => null,
    };

    expect(() => authMiddleware(req, {}, () => undefined)).to.throw(
      'Not authenticated'
    );
  });

  it('should throw an error if auth header is only one string', () => {
    const req = {
      get: () => 'xyz',
    };

    sinon.stub(jwt, 'verify');
    jwt.verify.returns({ userId: 'abc' });

    authMiddleware(req, {}, () => undefined);
    expect(jwt.verify.calledWith(undefined)).to.be.true;
    jwt.verify.restore();

    expect(() => authMiddleware(req, {}, () => undefined)).to.throw();
  });

  it('should throw an error if the token cannot be verified', () => {
    const req = {
      get: () => 'Bearer xyz',
    };
  });

  expect(() => authMiddleware(req, {}, () => {})).to.throw();

  it('should yield the user id afte decoding the token', () => {
    const req = {
      get: () => 'Bearer 123',
    };

    // replaces the method globally so could have issues with future tests
    // jwt.verify = function () {
    //   return { userId: 'abc' };
    // };

    sinon.stub(jwt, 'verify');
    jwt.verify.returns({ userId: 'abc' });

    authMiddleware(req, {}, () => {});
    expect(req).to.have.property('userId');
    expect(req).to.have.property('userId', 'abc');
    expect(jwt.verify.called).to.be.true;

    jwt.verify.restore();
  });
});
