'use strict';

var path = require('path'),
  should = require('should'),
  mongoose = require('mongoose');

mongoose.Promise = global.Promise;

var User = mongoose.model('User'),
  adviceConstants = require(path.resolve('./modules/advisor/server/lib/advice-constants')),
  userUtil = require(path.resolve('./modules/users/server/lib/user-util'));

var credentials, user, _user;

describe('user-util Unit Tests:', function() {
  beforeEach(function(done) {
    credentials = {
      username: 'username',
      password: 'M3@n.jsI$Aw3$0m3'
    };

    _user = {
      firstName: 'Full',
      lastName: 'Name',
      displayName: 'Full Name',
      email: 'test@test.com',
      username: credentials.username,
      password: credentials.password,
      provider: 'local'
    };

    user = new User(_user);

    user.save(function(err) {
      should.not.exist(err);
      done();
    });
  });

  describe('Method updateFatigueTimeConstant', function() {
    it('should return error if invalid user id', function(done) {
      return userUtil.updateFatigueTimeConstant(null, null, function(err, fatigueTimeConstant) {
        should.exist(err);
        (err.message).should.match('user id is not valid');
        done();
      });
    });

    it('should not return error if valid user id', function(done) {
      return userUtil.updateFatigueTimeConstant(user.id, null, function(err, fatigueTimeConstant) {
        should.not.exist(err);
        done();
      });
    });

    it('should return default user.fatigueTimeConstant if trainingEffortFeedback is null', function(done) {
      return userUtil.updateFatigueTimeConstant(user.id, null, function(err, fatigueTimeConstant) {
        should.not.exist(err);
        (fatigueTimeConstant).should.equal(adviceConstants.defaultFatigueTimeConstant);
        done();
      });
    });

    it('should return default fatigueTimeConstant if trainingEffortFeedback is zero', function(done) {
      return userUtil.updateFatigueTimeConstant(user.id, 0, function(err, fatigueTimeConstant) {
        should.not.exist(err);
        (fatigueTimeConstant).should.equal(adviceConstants.defaultFatigueTimeConstant);
        done();
      });
    });

    it('should return default fatigueTimeConstant plus one if trainingEffortFeedback is one', function(done) {
      return userUtil.updateFatigueTimeConstant(user.id, 1, function(err, fatigueTimeConstant) {
        should.not.exist(err);
        (fatigueTimeConstant).should.equal(adviceConstants.defaultFatigueTimeConstant + 1);
        done();
      });
    });

    it('should return default fatigueTimeConstant minue one if trainingEffortFeedback is -1', function(done) {
      return userUtil.updateFatigueTimeConstant(user.id, -1, function(err, fatigueTimeConstant) {
        should.not.exist(err);
        (fatigueTimeConstant).should.equal(adviceConstants.defaultFatigueTimeConstant - 1);
        done();
      });
    });

    it('should return default minimumFatigueTimeConstant if trainingEffortFeedback is -2', function(done) {
      return userUtil.updateFatigueTimeConstant(user.id, -2, function(err, fatigueTimeConstant) {
        should.not.exist(err);
        (fatigueTimeConstant).should.equal(adviceConstants.minimumFatigueTimeConstant);
        done();
      });
    });

    it('should return default minimumFatigueTimeConstant if current user.fatigueTimeConstant equals minimumFatigueTimeConstant and trainingEffortFeedback is -2', function(done) {
      user.fatigueTimeConstant = adviceConstants.minimumFatigueTimeConstant;
      user.save(function(err) {
        should.not.exist(err);
        return userUtil.updateFatigueTimeConstant(user.id, -2, function(err, fatigueTimeConstant) {
          should.not.exist(err);
          (fatigueTimeConstant).should.equal(adviceConstants.minimumFatigueTimeConstant);
          done();
        });
      });
    });

    it('should return default maximumFatigueTimeConstant if trainingEffortFeedback is 2', function(done) {
      return userUtil.updateFatigueTimeConstant(user.id, 2, function(err, fatigueTimeConstant) {
        should.not.exist(err);
        (fatigueTimeConstant).should.equal(adviceConstants.maximumFatigueTimeConstant);
        done();
      });
    });

    it('should return default maximumFatigueTimeConstant if current user.fatigueTimeConstant equals maximumFatigueTimeConstant and trainingEffortFeedback is 2', function(done) {
      user.fatigueTimeConstant = adviceConstants.maximumFatigueTimeConstant;
      user.save(function(err) {
        should.not.exist(err);
        return userUtil.updateFatigueTimeConstant(user.id, 2, function(err, fatigueTimeConstant) {
          should.not.exist(err);
          (fatigueTimeConstant).should.equal(adviceConstants.maximumFatigueTimeConstant);
          done();
        });
      });
    });
  });

  afterEach(function(done) {
    User.remove().exec(done);
  });
});
