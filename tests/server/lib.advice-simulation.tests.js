'use strict';


var path = require('path'),
  should = require('should'),
  mongoose = require('mongoose'),
  moment = require('moment'),
  User = mongoose.model('User'),
  TrainingDay = mongoose.model('TrainingDay'),
  testHelpers = require(path.resolve('./modules/trainingdays/tests/server/util/test-helpers')),
  adviceConstants = require('../../server/lib/advice-constants'),
  adviceEngine = require('../../server/lib/advice-engine');

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

  describe('Simulation Rules', function () {
    it('should not return simulation if not build period', function (done) {
      trainingDay.period = 'base';
      return adviceEngine._testGenerateAdvice(user, trainingDay, 'advised', function(err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].activityType).should.not.match(/simulation/);
        done();
      });
    });

    it('should not return simulation if in build period but today is not our preferred simulation day', function (done) {
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

        return adviceEngine._testGenerateAdvice(user, trainingDay, 'advised', function(err, trainingDay) {
          should.not.exist(err);
          should.exist(trainingDay);
          (trainingDay.plannedActivities[0].activityType).should.not.match(/simulation/);
          done();
        });
      });
    });

    it('should return simulation recommendation if in build period and today is our preferred simulation day', function (done) {
      trainingDay.period = 'build';
      user.preferredSimulationDay = [moment(trainingDate).day().toString()];
      return adviceEngine._testGenerateAdvice(user, trainingDay, 'advised', function(err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].activityType).should.match(/simulation/);
        (trainingDay.plannedActivities[0].rationale).should.containEql('sufficiently rested and today is our preferred simulation day');
        done();
      });
    });

    // it('should not return simulation if in build period, no preferred simulation day but simulation is not overdue', function (done) {
    //   trainingDay.period = 'build';
    //   var priorDay = moment(trainingDate).subtract(7, 'days');
    //   var completedActivities = [{
    //     activityType: 'simulation'
    //   }];

    //   testHelpers.createTrainingDay(user, priorDay, completedActivities, function(err) {
    //     if (err) {
    //       console.log('createTrainingDay: ' + err);
    //     }

    //     return adviceEngine._testGenerateAdvice(user, trainingDay, 'advised', function(err, trainingDay) {
    //       should.not.exist(err);
    //       should.exist(trainingDay);
    //       (trainingDay.plannedActivities[0].activityType).should.not.match(/simulation/);
    //       done();
    //     });
    //   });
    // });

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

        // return adviceEngine._testGenerateAdvice(user, trainingDay, 'advised', function(err, trainingDay) {
  //         should.not.exist(err);
  //         should.exist(trainingDay);
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
