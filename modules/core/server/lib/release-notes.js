'use strict';

var releaseNotes = [
  {
    version: '0.7.0',
    title: 'Historical FTP Release - 0.7.0',
    message: '',
    features: [
      'We now keep your previous threshold power values when you provide a new FTP. You can also manually enter previous values. See My Profile page.',
      'And, when Syncing with Strava, you can now specify that we should replace existing rides in Tacit Training. We will use the appropriate FTP when processing the rides. This will improve the accuracy of your historical data.',
      'Also, when downloading activities from Strava, we can check Strava for a new FTP and update in Tacit Training if different. This is a preference on My Profile page.'
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
