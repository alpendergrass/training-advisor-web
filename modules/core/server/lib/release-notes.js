'use strict';

var releaseNotes = [
  {
    version: '0.9.10',
    title: '',
    message: '',
    features: [
      'Added user admin enhancements.',
      'Periodically scrub database to remove stale training data.'
    ],
    fixes: [
      'Fixed a bug that was preventing even distribution of workout assignments.'
    ]
  },
  {
    version: '0.9.9',
    title: '',
    message: '',
    features: [
    ],
    fixes: [
      'When computing weighted average watts, we now ignore power recs when rider is not moving. Bug was causing us to underestimate weighted average watts resulting in a low load computation.'
    ]
  },
  {
    version: '0.9.8',
    title: '',
    message: '',
    features: [
      'Adjust thresholds for recommending climbing workouts.'
    ],
    fixes: []
  },
  {
    version: '0.9.7',
    title: '',
    message: '',
    features: [
      'After creating event redirect to dashboard.'
    ],
    fixes: [
      'Fix dup key errors.',
    ]
  },
  {
    version: '0.9.6',
    title: '',
    message: '',
    features: [
      'If no goal exists, we will use a virtual goal day when computing current advice.',
      'Do not repeat testing recommendation more that a couple of times.'
    ],
    fixes: [
      'Log additional info to help track down dup key errors.',
    ]
  },
  {
    version: '0.9.5',
    title: '',
    message: '',
    features: [
      'Allow user to adjust target ramp rate.',
      'Allow user to set estimated load and terrain for non-goal events.',
      'Use non-goal event load estimates when updating season forecast.',
      'Show estimated load and terrain for events on dashboard.',
      'Generate useful plan even if no goal has been defined.',
      'Modify workout usage counting to provide better insight.'
    ],
    fixes: [
      'We were not consistently updating daily metrics after activity was added or removed.',
      'We were not recommending forecast update after adding/changing/removing activity.'
    ]
  },
  {
    version: '0.9.4',
    title: 'Easier Start Up for New Users - Version 0.9.4',
    message: '',
    features: [
      'Automatically create start day for new user.',
      'Prompt new user to sync Strava after generating start day.',
      'Update FAQ for these changes.'
    ],
    fixes: [
      'We were not consistently setting time zone alert.'
    ]
  },
  {
    version: '0.9.3',
    title: 'Forecast Feature, Recovery Adjustment, Yesterday on Dashboard - 0.9.3',
    message: 'Lots of goodness in this release!',
    features: [
      'We are highlighting our fitness prediction capabilities by relabeling our "Update Season" button to be "Update Forecast". This feature is not new but is unique to Tacit Training and we want to make sure you understand what it can do for you.',
      'To help you tailor our recommendations to your abilities we added a "Speed Of Recovery" adjustment to My Profile page.',
      'We added yesterday\'s rides to the dashboard.',
      'Added Training Effort Rating for today on dashboard.',
      'We now combine load and intensity to rate a day\'s training effort in order to provide more appropriate recommendations for subsequent days.',
      'We are defaulting Strava activity and FTP auto-fetch to enabled for new users.',
      'Only show auto-fetch FTP option to Strava premium members as basic Strava members can not set FTP in Strava.'
    ],
    fixes: [
      'Cut down on redundant error reporting.',
      'Remove FTP needed notification if we retrieve a valid FTP from Strava.'
    ]
  },
  {
    version: '0.9.2',
    title: 'Forecast Feature, Recovery Adjustment, Yesterday on Dashboard - 0.9.2',
    message: 'Lots of goodness in this release!',
    features: [
      'We are highlighting our fitness prediction capabilities by relabeling our "Update Season" button to be "Update Forecast". This feature is not new but is unique to Tacit Training and we want to make sure you understand what it can do for you.',
      'To help you better tailor our recommendations to your abilities we added a "Speed Of Recovery" adjustment to My Profile page.',
      'We added yesterday\'s rides to the dashboard.',
      'We now combine load and intensity to rate a day\'s training effort in order to provide more appropriate recommendations for subsequent days.',
      'We are defaulting Strava activity and FTP auto-fetch to enabled for new users.',
      'Only show auto-fetch FTP option to Strava premium members as basic Strava members can not set FTP in Strava.'
    ],
    fixes: [
      'Cut down on redundant error reporting.',
      'Remove FTP needed notification if we retrieve a valid FTP from Strava.'
    ]
  },
  {
    version: '0.9.1',
    title: '',
    message: 'This release was mainly focused on bug fixes and technical housekeeping. However, we did sneak in one new feature. ',
    features: [
      'Allow user to request latest Strava FTP from My Profile page.'
    ],
    fixes: [
      'Prevent training day update collisions when doing a Strava activity sync or auto-fetch.',
      'Suppress noise in system logs.',
      'Extend authentication time-to-live to minimize authorization errors.',
      'Clarify that activity elevation gain is in meters.',
      'Take care of other messiness that we would rather not mention.'
    ]
  },
  {
    version: '0.9.0',
    title: 'Expanded Workout Collection Release - 0.9.0',
    message: 'We have restructured how we store workouts to make it easier to add new ones. And we have added some new ones! We will continue to expand the collection over the coming months. We will also be collecting statistics to help us tune our workout assignment logic. ',
    features: [
      'Restructure workout catalog.',
      'Improve workout selection functionality.',
      'Accumulate statistics on workout usage.',
      'If provided by the user, show estimated load for goal events on season view.',
      'Add alert if estimated load is missing from goal event.',
      'Clarify that a day off is a type of an event.',
      'Add elevation gain to training day activity list.',
      'When recomputing advice for today, recompute for tomorrow also.'
    ],
    fixes: []
  },
  {
    version: '0.8.2',
    title: 'Dashboard today/tomorrow date bug fix, Release 0.8.2',
    message: '',
    features: [],
    fixes: [
      'Fixed a bug on the dashboard that was causing the wrong dates to be displayed for today and tomorrow.'
    ]
  },
  {
    version: '0.8.1',
    title: 'The Dashboard Release plus - 0.8.1',
    message: 'We have added a user dashboard to Tacit Training. This is your new Tacit Training homepage! We have included a starter set of dashboard widgets and will be adding more. Let us know what you would like to see on YOUR dashboard.',
    features: [
      'Created dashboard and the first set of dashboard widgets.',
      'Added actual vs. planned load by week dashboard widget.'
    ],
    fixes: []
  },
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
