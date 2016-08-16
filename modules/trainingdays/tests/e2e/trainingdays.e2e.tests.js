'use strict';

describe('TrainingDays E2E Tests:', function () {
  describe('Test trainingDays page', function () {
    it('Should report missing credentials', function () {
      browser.get('http://localhost:3001/trainingDays');
      expect(element.all(by.repeater('trainingDay in trainingDays')).count()).toEqual(0);
    });
  });
});
