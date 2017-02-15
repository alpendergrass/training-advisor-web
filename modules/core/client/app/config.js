'use strict';

// Init the application configuration module for AngularJS application
var ApplicationConfiguration = (function () {
  // Init module configuration options
  var applicationModuleName = 'training-advisor';
  var applicationModuleVendorDependencies = ['ngResource', 'ngAnimate', 'ngMessages', 'ngSanitize', 'ui.router', 'ui.bootstrap', 'ui.utils', 'xeditable', 'toastr', 'angularSpinner', 'angular-timezone-selector', 'ngMaterial', 'materialCalendar', 'chart.js', 'LocalStorageModule'];
  //angularFileUpload is only used to upload profile picture and is not compatible with later versions of angular.

  // Add a new vertical module
  var registerModule = function (moduleName, dependencies) {
    // Create angular module
    angular.module(moduleName, dependencies || []);

    // Add the module to the AngularJS configuration file
    angular.module(applicationModuleName).requires.push(moduleName);
  };

  return {
    applicationModuleName: applicationModuleName,
    applicationModuleVendorDependencies: applicationModuleVendorDependencies,
    registerModule: registerModule
  };
})();
