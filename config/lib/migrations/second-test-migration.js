'use strict';

module.exports = {
  id: 'second-test-migration.js',

  up: function(db, callback) {
    // return callback(new Error('test error'));
    return callback();
  },

  down: function(db, callback) {
    callback();
  }
};
