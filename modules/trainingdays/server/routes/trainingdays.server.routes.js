'use strict';


var trainingDaysPolicy = require('../policies/trainingdays.server.policy'),
  trainingDays = require('../controllers/trainingdays.server.controller');

module.exports = function (app) {
  // TrainingDays collection routes
  app.route('/api/trainingDays').all(trainingDaysPolicy.isAllowed)
    .get(trainingDays.list)
    .post(trainingDays.create);

  app.route('/api/trainingDays/getSeason/:today').all(trainingDaysPolicy.isAllowed)
    .get(trainingDays.getSeason);

  // Single trainingDay routes
  app.route('/api/trainingDays/:trainingDayId').all(trainingDaysPolicy.isAllowed)
    .get(trainingDays.read)
    .put(trainingDays.update)
    .delete(trainingDays.delete);

  app.route('/api/trainingDays/getSimDay/:trainingDayId').all(trainingDaysPolicy.isAllowed)
    .get(trainingDays.getSimDay);

  app.route('/api/trainingDays/finalizeSim/:commit').all(trainingDaysPolicy.isAllowed)
    .get(trainingDays.finalizeSim);

  app.route('/api/trainingDays/getDay/:trainingDate').all(trainingDaysPolicy.isAllowed)
    .get(trainingDays.getDay);

  app.route('/api/trainingDays/getAdvice/:trainingDate').all(trainingDaysPolicy.isAllowed)
    .get(trainingDays.getAdvice);

  app.route('/api/trainingDays/genPlan/:trainingDate').all(trainingDaysPolicy.isAllowed)
    .get(trainingDays.genPlan);

  app.route('/api/trainingDays/downloadActivities/:trainingDayId').all(trainingDaysPolicy.isAllowed)
    .get(trainingDays.downloadActivities);

  app.route('/api/trainingDays/strava/webhook').all(trainingDaysPolicy.isAllowed)
    .get(trainingDays.validateWebhookSubscription)
    .post(trainingDays.postWebhookEvent);

  // Finish by binding the trainingDay middleware
  app.param('trainingDayId', trainingDays.trainingDayByID);
};
