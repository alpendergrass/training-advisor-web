'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
  should = require('should'),
  mongoose = require('mongoose'),
  moment = require('moment'),
  User = mongoose.model('User'),
  TrainingDay = mongoose.model('TrainingDay'),
  testHelpers = require(path.resolve('./modules/trainingdays/tests/server/util/test-helpers')),
  adviceConstants = require('../../server/lib/advice-constants'),
  adviceSimulation = require('../../server/lib/advice-simulation');

var user, trainingDate, trainingDay;

describe('advice-simulation Unit Tests:', function () {

  beforeEach(function (done) {
    testHelpers.createUser(function(err, newUser) {
      if (err) {
        return done(err);
      }

      user = newUser;    
      trainingDate = moment().startOf('day').toDate();
      trainingDay = testHelpers.createTrainingDayObject(trainingDate, user);
      done();
    });
  });

  describe('Method checkSimulation', function () {
    it('should return error if no user', function (done) {
      return adviceSimulation.checkSimulation(null, null, function (err, user, trainingDay) {
        should.exist(err);
        (err.message).should.match('valid user is required');
        done();
      });
    });
    
    it('should return error if no trainingDay', function (done) {
      return adviceSimulation.checkSimulation(user, null, function (err, user, trainingDay) {
        should.exist(err);
        (err.message).should.match('valid trainingDay is required');
        done();
      });
    });

    it('should not return a recommendation if not build period', function (done) {
      trainingDay.period = 'base';
      return adviceSimulation.checkSimulation(user, trainingDay, function (err, user, trainingDay) {
        should.not.exist(err);
        should.exist(user);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].activityType).should.match('');
        done();
      });
    });

    it('should not return a recommendation if in build period but today is not our preferred simulation day', function (done) {
      trainingDay.period = 'build';
      user.preferredSimulationDay = [moment(trainingDate).add(2, 'days').day().toString()];
      //Make sure simulation is not overdue.
      var priorDay = moment(trainingDate).subtract(3, 'days');
      var completedActivities = [{
        activityType: 'simulation'
      }];

      testHelpers.createTrainingDay(user, priorDay, completedActivities, function(err) {
        if (err) {
          console.log('createTrainingDay: ' + err);
        }

        return adviceSimulation.checkSimulation(user, trainingDay, function (err, user, trainingDay) {
          should.not.exist(err);
          should.exist(user);
          should.exist(trainingDay);
          (trainingDay.plannedActivities[0].activityType).should.match('');
          done();
        });
      });
    });

    it('should return simulation recommendation if in build period and today is our preferred simulation day', function (done) {
      trainingDay.period = 'build';
      user.preferredSimulationDay = [moment(trainingDate).day().toString()];
      return adviceSimulation.checkSimulation(user, trainingDay, function (err, user, trainingDay) {
        should.not.exist(err);
        should.exist(user);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].activityType).should.match(/simulation/);
        (trainingDay.plannedActivities[0].rationale).should.containEql('We are in a build period. Today is our preferred simulation day.');
        done();
      });
    });

    it('should return no recommendation if in peak period and today is our preferred simulation day', function (done) {
      trainingDay.period = 'peak';
      user.preferredSimulationDay = [moment(trainingDate).day().toString()];
      return adviceSimulation.checkSimulation(user, trainingDay, function (err, user, trainingDay) {
        should.not.exist(err);
        should.exist(user);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].activityType).should.match('');
        done();
      });
    });

    it('should not return a recommendation if in build period, no preferred simulation day but simulation is not overdue', function (done) {
      trainingDay.period = 'build';
      var priorDay = moment(trainingDate).subtract(7, 'days');
      var completedActivities = [{
        activityType: 'simulation'
      }];

      testHelpers.createTrainingDay(user, priorDay, completedActivities, function(err) {
        if (err) {
          console.log('createTrainingDay: ' + err);
        }

        return adviceSimulation.checkSimulation(user, trainingDay, function (err, user, trainingDay) {
          should.not.exist(err);
          should.exist(user);
          should.exist(trainingDay);
          // console.log('returned trainingDay: ' + trainingDay);
          (trainingDay.plannedActivities[0].activityType).should.match('');
          done();
        });
      });
    });

  //   it('should return simulation recommendation if in build period, no preferred simulation day and simulation is overdue', function (done) {
  //     trainingDay.period = 'build';
  //     var priorDay = moment(trainingDate).subtract(8, 'days');
  //     var completedActivities = [{
  //       activityType: 'simulation'
  //     }];

  //     testHelpers.createTrainingDay(user, priorDay, completedActivities, function(err) {
  //       if (err) {
  //         console.log('createTrainingDay: ' + err);
  //       }

  //       return adviceSimulation.checkSimulation(user, trainingDay, function (err, user, trainingDay) {
  //         should.not.exist(err);
  //         should.exist(user);
  //         should.exist(trainingDay);
  //         // console.log('returned trainingDay: ' + trainingDay);
  //         (trainingDay.plannedActivities[0].activityType).should.match(/simulation/);
  //         (trainingDay.plannedActivities[0].rationale).should.containEql('Simulation is overdue');
  //         done();
  //       });
  //     });
  //   });
  });

  afterEach(function (done) {
    TrainingDay.remove().exec(function () {
      User.remove().exec(done);
    });
  });
});
