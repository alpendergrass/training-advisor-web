'use strict';

var releaseNotes = [
  {
    version: '0.7.0',
    title: '',
    message: '',
    features: [
      'We now retain your previous threshold power settings. See My Profile.',
      'When Syncing with Strava, we can now specify that we should replace existing rides in Tacit Training with the corresponding rides from Strava, ensuring that the appropriate FTP is used when processing the rides.'
    ],
    fixes: [
      ''
    ]
  },
  {
    version: '0.6.10',
    title: '',
    message: 'Fixed a few bugs.',
    features: [],
    fixes: [
      'When setting up sim are we reloading chart after changing day. Stop, it takes too long.',
      'Update of xeditable or something related broke xeditable radio button value validations.'
    ]
  },
  {
    version: '0.6.9',
    title: '',
    message: '',
    features: [
      'List new features when a new version of the app is loaded. (This :)'
    ],
    fixes: []
  }
];

exports.notes = releaseNotes;
