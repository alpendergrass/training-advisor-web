'use strict';


var path = require('path'),
  mongoose = require('mongoose'),
  moment = require('moment'),
  _ = require('lodash'),
  Schema = mongoose.Schema,
  crypto = require('crypto'),
  validator = require('validator'),
  generatePassword = require('generate-password'),
  owasp = require('owasp-password-strength-test'),
  coreUtil = require(path.resolve('./modules/core/server/lib/util'));

mongoose.Promise = global.Promise;

// A Validation function for local strategy properties
var validateLocalStrategyProperty = function (property) {
  return ((this.provider !== 'local' && !this.updated) || property.length);
};

//A Validation function for local strategy email
var validateLocalStrategyEmail = function (email) {
  return ((this.provider !== 'local' && !this.updated) || validator.isEmail(email));
};

var invalidDataErrorMessage = 'The value of `{PATH}` ({VALUE}) is not a valid value.';

var ftpSources = {
  values: 'strava|manual|migration'.split('|'),
  message: invalidDataErrorMessage
};

var notificationTypes = {
  values: 'ftp|timezone|fetchstrava|fetchstravaftp|stravasync|start|goal|plangen|terrain|loadestimate'.split('|'),
  message: invalidDataErrorMessage
};

var blockableNotificationTypes = {
  values: 'plangen|start|'.split('|'),
  message: invalidDataErrorMessage
};

var minMessage = 'The value of `{PATH}` ({VALUE}) is less than the limit ({MIN}).';
var maxMessage = 'The value of `{PATH}` ({VALUE}) exceeds the limit ({MAX}).';
// Note that in the UI we limit to 50 - 500 but here we allow a lower value from Strava.
// Strava's limits are 0 - 500.
var minFTP = [0, minMessage];
var maxFTP = [500, maxMessage];

var UserSchema = new Schema({
  firstName: {
    type: String,
    trim: true,
    default: '',
    validate: [validateLocalStrategyProperty, 'Please fill in your first name']
  },
  lastName: {
    type: String,
    trim: true,
    default: '',
    validate: [validateLocalStrategyProperty, 'Please fill in your last name']
  },
  displayName: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    default: '',
    validate: [validateLocalStrategyEmail, 'Please provide a valid email address']
  },
  emailNewsletter: {
    type: Boolean,
    default: true
  },
  username: {
    type: String,
    unique: 'Username already exists',
    required: 'Please provide a username',
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    default: ''
  },
  salt: {
    type: String
  },
  waitListed: {
    type: Boolean,
    default: false
  },
  profileImageURL: {
    type: String,
    default: 'modules/users/client/img/profile/default.png'
  },
  ftpLog: [{
    ftp: {
      type: Number,
      min: minFTP,
      max: maxFTP,
      default: 100
    },
    ftpDate: {
      type: Date,
      default: Date.now
    },
    ftpDateNumeric: {
      type: Number,
      default: coreUtil.toNumericDate(moment().toDate())
    },
    ftpSource: {
      type: String,
      enum: ftpSources,
      default: ftpSources.values[0]
    }
  }],
  lastTestRecommendationDateNumeric: {
    type: Number,
    default: null
  },
  recoveryRate: {
    type: Number,
    min: 0,
    max: 10,
    default: 5
  },
  rampRateAdjustment: {
    type: Number,
    min: -2,
    max: 2,
    default: 0
  },
  preferredRestDays: [{
    type: String
  }],
  levelOfDetail: {
    type: Number,
    min: 1,
    max: 3,
    default: 2
  },
  fatigueTimeConstant: {
    type: Number,
    min: 5,
    max: 9,
    default: 7
  },
  timezone: {
    type: String
  },
  provider: {
    type: String,
    required: 'Provider is required'
  },
  providerData: {},
  additionalProvidersData: {},
  autoFetchStravaActivities: {
    type: Boolean,
    default: true
  },
  autoUpdateFtpFromStrava: {
    type: Boolean,
    default: true
  },
  favorSufferScoreOverEstimatedPower: {
    type: Boolean,
    default: false
  },
  notifications: [{
    notificationType: {
      type: String,
      enum: notificationTypes
    },
    lookup: {
      type: String,
      default: ''
    },
    message: {
      type: String,
      default: ''
    },
    link: {
      type: String,
      default: ''
    },
    state: {
      type: String,
      default: ''
    },
    blocks: {
      // Presence of this notification type blocks the following notification type.
      // Beware of possible circular references.
      type: String,
      enum: blockableNotificationTypes,
      default: ''
    },
    blocked: {
      type: Boolean,
      default: false
    },
    alert: {
      type: Boolean,
      default: true
    }
  }],
  workoutLog: [{
    type: String
  }],
  roles: {
    type: [{
      type: String,
      enum: ['user', 'admin', 'waitlist']
    }],
    default: ['user'],
    required: 'Please provide at least one role'
  },
  updated: {
    type: Date
  },
  lastLogin: {
    type: Date
  },
  loginCount: {
    type: Number,
    default: 0
  },
  created: {
    type: Date,
    default: Date.now
  },
  /* For reset password */
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  userStats: {}
});

// Hook a pre save method to hash the password
UserSchema.pre('save', function (next) {
  if (this.password && this.isModified('password')) {
    this.salt = crypto.randomBytes(16).toString('base64');
    this.password = this.hashPassword(this.password);
  }

  if (this.isModified('lastLogin')) {
    this.loginCount++;
  }

  if (this.waitListed) {
    this.roles = ['waitlist'];
  } else if (_.includes(this.roles, 'waitlist')) {
    this.roles = ['user'];
  }

  next();
});


//Hook a pre-validate method to test the local password
UserSchema.pre('validate', function (next) {
  if (this.provider === 'local' && this.password && this.isModified('password')) {
    var result = owasp.test(this.password);
    if (result.errors.length) {
      var error = result.errors.join(' ');
      this.invalidate('password', error);
    }
  }

  next();
});

//Create instance method for hashing a password
UserSchema.methods.hashPassword = function (password) {
  if (this.salt && password) {
    return crypto.pbkdf2Sync(password, new Buffer(this.salt, 'base64'), 10000, 64).toString('base64');
  } else {
    return password;
  }
};

/**
 * Create instance method for authenticating user
 */
UserSchema.methods.authenticate = function (password) {
  return this.password === this.hashPassword(password);
};

/**
 * Find possible not used username
 */
UserSchema.statics.findUniqueUsername = function (username, suffix, callback) {
  var _this = this;
  var possibleUsername = username.toLowerCase() + (suffix || '');

  _this.findOne({
    username: possibleUsername
  }, function (err, user) {
    if (!err) {
      if (!user) {
        callback(possibleUsername);
      } else {
        return _this.findUniqueUsername(username, (suffix || 0) + 1, callback);
      }
    } else {
      callback(null);
    }
  });
};

/**
* Generates a random passphrase that passes the owasp test.
* Returns a promise that resolves with the generated passphrase, or rejects with an error if something goes wrong.
* NOTE: Passphrases are only tested against the required owasp strength tests, and not the optional tests.
*/
UserSchema.statics.generateRandomPassphrase = function () {
  return new Promise(function (resolve, reject) {
    var password = '';
    var repeatingCharacters = new RegExp('(.)\\1{2,}', 'g');

    // iterate until the we have a valid passphrase.
    // NOTE: Should rarely iterate more than once, but we need this to ensure no repeating characters are present.
    while (password.length < 20 || repeatingCharacters.test(password)) {
      // build the random password
      password = generatePassword.generate({
        length: Math.floor(Math.random() * (20)) + 20, // randomize length between 20 and 40 characters
        numbers: true,
        symbols: false,
        uppercase: true,
        excludeSimilarCharacters: true,
      });

      // check if we need to remove any repeating characters.
      password = password.replace(repeatingCharacters, '');
    }

    // Send the rejection back if the passphrase fails to pass the strength test
    if (owasp.test(password).errors.length) {
      reject(new Error('An unexpected problem occured while generating the random passphrase'));
    } else {
      // resolve with the validated passphrase
      resolve(password);
    }
  });
};

mongoose.model('User', UserSchema);
