'use strict';

var releaseNotes = [
  {
    version: '0.8.0',
    title: 'The Dashboard Release - 0.8.0',
    message: 'We have added a user dashboard to Tacit Training. This is your new Tacit Training homepage! We have included a starter set of dashboard widgets and will be adding more. Let us know what you would like to see on YOUR dashboard.',
    features: [
      'Created dashboard and the first set of dashboard widgets.'
    ],
    fixes: []
  },
  {
    version: '0.7.6',
    title: '',
    message: '',
    features: [
      'We now block the UI when loading or updating your season.'
    ],
    fixes: []
  },
  {
    version: '0.7.5',
    title: 'User Profile Bug Fix Fix, Release 0.7.5',
    message: '',
    features: [],
    fixes: [
      'Reverted part of previous change that caused season to be generated incorrectly.'
    ]
  },
  {
    version: '0.7.4',
    title: 'User Profile Bug Fix, Release 0.7.4',
    message: '',
    features: [],
    fixes: [
      'Fixed overlapping data updates during update season.'
    ]
  },
  {
    version: '0.7.3',
    title: 'User Profile Bug Fix, Release 0.7.3',
    message: '',
    features: [],
    fixes: [
      'Fixed user profile update error caused by overlapping updates.'
    ]
  },
  {
    version: '0.7.2',
    title: 'Season View Navigation and a Couple of Bug Fixes, Release 0.7.2',
    message: '',
    features: [
      'On My Season page, you can now expand and contract the season view with navigation buttons.'
    ],
    fixes: [
      'Long-running Strava Syncs were causing database update conflicts. The sync process now has to complete before anything else can be done.',
      'Update Season was wiping out planning for past days.'
    ]
  },
  {
    version: '0.7.1',
    title: 'FTP Management Features and a Bug Fix, Release 0.7.1',
    message: '',
    features: [
      'We now keep your previous threshold power values when you provide a new FTP. You can also manually enter previous values. See My Profile page.',
      'And, when Syncing with Strava, you can now specify that we should replace existing rides in Tacit Training. We will use the appropriate FTP when processing the rides. This will improve the accuracy of your historical data.',
      'Also, when downloading activities from Strava, we can check Strava for a new FTP and update in Tacit Training if different. This is a preference on My Profile page.'
    ],
    fixes: [
      'Detect and ignore invalid FTPs from Strava.'
    ]
  },
  {
    version: '0.7.0',
    title: 'Historical FTP Release - 0.7.0',
    message: '',
    features: [
      'We now keep your previous threshold power values when you provide a new FTP. You can also manually enter previous values. See My Profile page.',
      'And, when Syncing with Strava, you can now specify that we should replace existing rides in Tacit Training. We will use the appropriate FTP when processing the rides. This will improve the accuracy of your historical data.',
      'Also, when downloading activities from Strava, we can check Strava for a new FTP and update in Tacit Training if different. This is a preference on My Profile page.'
    ],
    fixes: []
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
