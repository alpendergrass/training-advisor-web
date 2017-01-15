'use strict';

angular.module('core').controller('AboutController', ['$scope', 'Authentication',
  function (Authentication) {
    this.authentication = Authentication;
    this.sections = [{
      title: 'What It Does',
      content: '<p>Tacit Training is a training tool for cyclists that does three main things. Using the goals you set and data from your power meter, it will:<ol><li>Create a dynamic <b>season training plan,</b></li><li>Enable you to run <b>"what-if" scenarios</b> to see how your training may be affected if you change your goals, and</li><li>Provide <b>daily training advice</b> based on your current fitness and fatigue levels.</li></ol>While this may sound like other apps you\'ve used or heard of, what sets Tacit Training apart is the <b>always current, hands-off</b> nature of the app.</p>'
    }, {
      title: 'Season Training Plan',
      content: '<p>What makes the Season Plan in Tacit Training unique is that it is created and  updated based on the time you\'ve spent on the bike so far. While other training plans are static documents created at the beginning of the season, the season view in Tacit Training is updated on a periodic basis so that future plans are always based on the work you\'ve actually done, not the work your plan says you should have done.</p>'
    }, {
      title: 'What-If Scenarios',
      content: '<p>Another unique feature of Tacit Training is the Training Plan "What If" mode. Using your current plan as a starting point, you can try out what-if scenarios to see how your plan would change. For example, you can add a new event to your season and see how that impacts preparations for your goal event. Or you could plug in a few off days for that trip to the beach you are planning and see how your form will be affected. After running your scenarios, you have the ability to either accept the what-if view as your new plan or to keep you current plan.</p>'
    }, {
      title: 'Daily Training Advice',
      content: '<p>In general, other apps provide lots of analysis tools to allow you to look at your previous workouts but leave it up to you to decide what you should do next. Tacit Training takes a different approach by doing the analysis for you and giving daily training advice on what we think you should do next based on the work you\'ve done and when your priority events are scheduled.</p>'
    }, {
      title: 'Tacit Training <small>Cycling Training Simplified</small>',
      content: '<p>When I first conceived of Tacit Training, I was thinking of riders like me. I love to ride, I want to ride faster and go further, I want my time on the bike to be effective training, but I am often too busy to spend a lot of time planning and monitoring my training. If this sounds like you, Tacit Training can be a game-changer. I invite you to give it a try.</p><p class="top-buffer-4x"><a class="btn background-color-tacit-red btn-lg" href="/season">Get Started</a></p><p class="top-buffer-4x"><b>Al Pendergrass</b><br>Creator of Tacit Training</p><p><a class="strava-me" href="https://www.strava.com/athletes/433782" target="_blank" title="Al on Strava"><img id="strava" src="/modules/core/client/img/strava.png" alt="Al on Strava" width="40" height="40"></a></p>'
    }];
  }
]);
