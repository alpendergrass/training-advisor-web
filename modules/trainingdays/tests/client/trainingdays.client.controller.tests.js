'use strict';

(function () {
  // TrainingDays Controller Spec
  describe('TrainingDays Controller Tests', function () {
    // Initialize global variables
    var TrainingDaysController,
      scope,
      $httpBackend,
      $stateParams,
      $location,
      Authentication,
      TrainingDays,
      mockTrainingDay,
      trainingDate;

    // The $resource service augments the response object with methods for updating and deleting the resource.
    // If we were to use the standard toEqual matcher, our tests would fail because the test values would not match
    // the responses exactly. To solve the problem, we define a new toEqualData Jasmine matcher.
    // When the toEqualData matcher compares two objects, it takes only object properties into
    // account and ignores methods.
    beforeEach(function () {
      jasmine.addMatchers({
        toEqualData: function (util, customEqualityTesters) {
          return {
            compare: function (actual, expected) {
              return {
                pass: angular.equals(actual, expected)
              };
            }
          };
        }
      });
    });

    // Then we can start by loading the main application module
    beforeEach(module(ApplicationConfiguration.applicationModuleName));

    // The injector ignores leading and trailing underscores here (i.e. _$httpBackend_).
    // This allows us to inject a service but then attach it to a variable
    // with the same name as the service.
    beforeEach(inject(function ($controller, $rootScope, _$location_, _$stateParams_, _$httpBackend_, _Authentication_, _TrainingDays_) {
      // Set a new global scope
      scope = $rootScope.$new();

      // Point global variables to injected services
      $stateParams = _$stateParams_;
      $httpBackend = _$httpBackend_;
      $location = _$location_;
      Authentication = _Authentication_;
      TrainingDays = _TrainingDays_;
      trainingDate = new Date();

      // create mock trainingDay
      var plannedActivities = [];
      plannedActivities[0] = {};
      plannedActivities[0].activityType = 'event';

      mockTrainingDay = new TrainingDays({
        _id: '525a8422f6d0f87f0e407a33',
        date: trainingDate,
        name: 'Name of an trainingDay',
        plannedActivities: plannedActivities,
        notes: 'these are notes.'
      });

      // Mock logged in user
      Authentication.user = {
        roles: ['user']
      };

      // Initialize the TrainingDays controller.
      TrainingDaysController = $controller('TrainingDaysController', {
        $scope: scope
      });
    }));

    it('$scope.find() should create an array with at least one trainingDay object fetched from XHR', inject(function (TrainingDays) {
      // Create a sample trainingDays array that includes the new trainingDay
      var sampleTrainingDays = [mockTrainingDay];

      // Set GET response
      $httpBackend.expectGET('api/trainingDays').respond(sampleTrainingDays);

      // Run controller functionality
      scope.find();
      $httpBackend.flush();

      // Test scope value
      expect(scope.trainingDays).toEqualData(sampleTrainingDays);
    }));

    it('$scope.findOne() should create an array with one trainingDay object fetched from XHR using a trainingDayId URL parameter', inject(function (TrainingDays) {
      // Set the URL parameter
      $stateParams.trainingDayId = mockTrainingDay._id;

      // Set GET response
      $httpBackend.expectGET(/api\/trainingDays\/([0-9a-fA-F]{24})$/).respond(mockTrainingDay);

      // Run controller functionality
      scope.findOne();
      $httpBackend.flush();

      // Test scope value
      expect(scope.trainingDay).toEqualData(mockTrainingDay);
    }));

    describe('$scope.createGoalEvent()', function () {
      var sampleTrainingDayPostData;

      beforeEach(function () {

        var plannedActivities = [];
        plannedActivities[0] = {};
        plannedActivities[0].activityType = 'event';

        // Create a sample trainingDay object
        sampleTrainingDayPostData = new TrainingDays({
          date: trainingDate,
          name: 'Name of an trainingDay',
          plannedActivities: plannedActivities,
          notes: 'these are notes.'
        });

        // Fixture mock form input values
        scope.date = trainingDate;
        scope.name = 'Name of an trainingDay';
        scope.notes = 'these are notes.';

        spyOn($location, 'path');
      });

      it('should send a POST request with the form input values and then locate to new object URL', inject(function (TrainingDays) {
        // Set POST response
        $httpBackend.expectPOST('api/trainingDays', sampleTrainingDayPostData).respond(mockTrainingDay);

        // Run controller functionality
        scope.createGoalEvent(true);
        $httpBackend.flush();

        // Test form inputs are reset
        expect(scope.name).toEqual('');
        expect(scope.notes).toEqual('');

        // Test URL redirection after the trainingDay was created
        expect($location.path.calls.mostRecent().args[0]).toBe('trainingDays/' + mockTrainingDay._id);
      }));

      it('should set scope.error if save error', function () {
        var errorMessage = 'this is an error message';
        $httpBackend.expectPOST('api/trainingDays', sampleTrainingDayPostData).respond(400, {
          message: errorMessage
        });

        scope.createGoalEvent(true);
        $httpBackend.flush();

        expect(scope.error).toBe(errorMessage);
      });
    });

    describe('$scope.update()', function () {
      beforeEach(function () {
        // Mock trainingDay in scope
        scope.trainingDay = mockTrainingDay;
      });

      it('should update a valid trainingDay', inject(function (TrainingDays) {
        // Set PUT response
        $httpBackend.expectPUT(/api\/trainingDays\/([0-9a-fA-F]{24})$/).respond();

        // Run controller functionality
        scope.update(true);
        $httpBackend.flush();

        // Test URL location to new object
        expect($location.path()).toBe('/trainingDays/' + mockTrainingDay._id);
      }));

      it('should set scope.error to error response message', inject(function (TrainingDays) {
        var errorMessage = 'error';
        $httpBackend.expectPUT(/api\/trainingDays\/([0-9a-fA-F]{24})$/).respond(400, {
          message: errorMessage
        });

        scope.update(true);
        $httpBackend.flush();

        expect(scope.error).toBe(errorMessage);
      }));
    });

    describe('$scope.remove(trainingDay)', function () {
      beforeEach(function () {
        // Create new trainingDays array and include the trainingDay
        scope.trainingDays = [mockTrainingDay, {}];

        // Set expected DELETE response
        $httpBackend.expectDELETE(/api\/trainingDays\/([0-9a-fA-F]{24})$/).respond(204);

        // Run controller functionality
        scope.remove(mockTrainingDay);
      });

      it('should send a DELETE request with a valid trainingDayId and remove the trainingDay from the scope', inject(function (TrainingDays) {
        expect(scope.trainingDays.length).toBe(1);
      }));
    });

    describe('scope.remove()', function () {
      beforeEach(function () {
        spyOn($location, 'path');
        scope.trainingDay = mockTrainingDay;

        $httpBackend.expectDELETE(/api\/trainingDays\/([0-9a-fA-F]{24})$/).respond(204);

        scope.remove();
        $httpBackend.flush();
      });

      it('should redirect to trainingDays', function () {
        expect($location.path).toHaveBeenCalledWith('trainingDays');
      });
    });
  });
}());
