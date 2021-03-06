'use strict';

angular.module('core').controller('FAQController',
  function() {
    this.FAQ = [{
      sectionTitle: 'What is Tacit Training?',
      questions: [{
        question: 'What is it?',
        answer: 'Tacit Training is an app for cyclists, powered by Strava, that provides a season-long plan and dispenses training advice that will help you achieve your cycling objectives. '
      }, {
        question: 'What make Tacit Training unique?',
        answer: 'Tacit Training provides training advice based on your <em>current</em> fitness. It does not matter if yesterday you followed our advice or not, the workout we prescribe today will be based on your workout history, including the work you did or did not do yesterday. And if your goals change, we adjust our recommendations automatically to help you best prepare for those goals. We also forecast your future fitness based on your fitness today and the training plan we generate, a forecast that can be recomputed at any time as your future plans change.'
      }, {
        question: 'Who is it for?',
        answer: 'Tacit Training is for any cyclist that wants to go faster and/or further. The app is structured around a training season with goal events, which is typically how competitive cyclists set up their training. But Tacit Training works for any cyclist. If you want to improve your cycling fitness, Tacit Training can help. Your goal can be any date on the calendar that you want to be at your best. One of our recent goal "events" was the start of a ten day mountain biking trip to Utah.'
      }, {
        question: 'What equipment do I need in order to use Tacit Training?',
        answer: '<p>Tacit Training is most accurate when you have a power meter on the bike you ride the most. Much of the functionality in the app relies on power data. For rides where power meter data is not available Strava provides estimated power and we will use that. You can also estimate when needed using other rides of similar intensity and duration as a guide.</p><p>And, ideally, you have a head unit that displays Training Load (typically as TSS® - Training Stress Score®) in real time. Most head units do these days. You can make effective use of Tacit Training without this but we like being able to see our Training Load in real time.</p>'
      }, {
        question: 'How is Tacit Training different from other training tools?',
        answer: 'Most currently available tools focus on analysis of your workout data with charts, graphs and numbers. It is then up to you to figure out how to use those numbers to plan future training. Tacit Training automates much of this analysis and generates a season plan and dispenses advice based on that analysis. And unlike static training plans, the season plan created by Tacit Training can be regenerated at any time, taking into account the training you have done, any events you have added to your calendar and any off-days you have scheduled.'
      }]
    }, {
      sectionTitle: 'The Basics',
      questions: [{
        question: 'How do I use Tacit Training on a daily basis?',
        answer: '<p>Every day you should check Tacit Training for your daily training recommendation. Tacit Training will advise you if you should ride or not and if so, what kind of ride to do. Tacit Training will also give you a suggested Training Load range for the day. While riding, you can monitor your Training Load (typically shown as TSS® - Training Stress Score®) in real-time on your head unit to stay within those parameters.</p><p>You should view the My Season page to see the big picture. This will help you understand how you are progressing and what is planned for future training days.</p>'
      }, {
        question: 'How do I get started?',
        answer: 'You create an account by linking to your Strava account. Click the Strava button on the sign in page, enter your Strava credentials if you are not already logged into Strava, authorize Tacit Training to access your Strava data and you are logged in.</p><p>You then need to enter some personal information on the My Profile Page. The most important bits are your time zone and your Functional Threshold Power (which we may have retrieved from Strava when you logged in).</p>'
      }, {
        question: 'Tacit Training tells me I should create a goal event. How do I do this?',
        answer: 'Click the alert telling you need to do this or go to the "Training Days | Schedule Events or Days Off" menu. For your goal event you can provide a Training Load estimate for the event. A reasonable guess will do but if you have no idea, leave it blank - you can true it up later once you have a better feel for Training Load. You should also set the terrain for the event as we use this setting to tailor your training advice to the nature of your goal event.'
      }, {
        question: 'How does Tacit Training get my ride data?',
        answer: 'Tacit Training needs your Training Load for every ride you do. If you set up your profile to automatically fetch your ride data, then Tacit Training will be notified by Strava when you have a new activity in Strava and we will go get it. As an alternative, on My Training Day you can download rides from Strava by clicking the orange button. You can also manually enter a ride by clicking the + button. See the Ride Data section below for more.'
      }, {
        question: 'How do I see the big picture?',
        answer: 'Go to My Season and click the Update Forecast button. This will compute a training plan thru your last goal event. By looking at your projected fitness, fatigue and form numbers on the date of your goal events, you have an idea of what fitness to expect if you follow our recommendations.'
      }, {
        question: 'How do I use My Season?',
        answer: '<p>Use the chart to monitor your progress and to see what is in store for you. For future days it shows a plan that uses an average of the recommended load range. For past days it will display both plan and actual ride data.</p><p>The future is based on the assumption that you will follow the advice to the letter. However, we know no one will. You should frequently update your season forecast so that it can take into account the work you have done. It will also incorporate any events or off-days you have scheduled.</p><p>If the Update Forecast button is red, that means some data has changed that could affect your season. Click the button.</p>'
      }, {
        question: 'I am considering adding an event to my calendar but am concerned it will negatively impact my goal performance. Can you help me with this?',
        answer: 'We built our What-If Simulator to help answer questions like this. This will let you see how your season will be affected by doing or skipping specific events or workouts. The buttons to run what-if simulations are at the bottom of the Season page. There is also a help button that explains how to use it.'
      }]
    }, {
      sectionTitle: 'The Advice',
      questions: [{
        question: 'Do I have to always follow the advice in order to get any benefit? ',
        answer: 'No. Tacit Training does not know everything that is going on in your life. Or, most importantly, how you feel today. Do what you have to do, ride when you can but always pay attention to what your body is telling you. As long we have your ride data, Tacit Training will help keep you on track. We know you will not follow our advice every day but if we have the data we will adjust.'
      }, {
        question: 'Tacit Training says I should go easy today but I feel good, I want to hammer!  What should I do?',
        answer: 'By all means, go hard. You know how you feel. All we know are numbers and what you tell us. Note that on My Training Day, after you receive advice, you have the option of specifying that you want to do a different sort of ride than what we recommend. If you request a different ride, we will give you a Training Load range for that ride type.'
      }, {
        question: 'Tacit Training says I should go hard today but I’m too tired or I’m sick.  What should I do?',
        answer: 'Do what your body is telling you to do. If you need to rest, by all means REST. As with any advice you are given, only you can decide if it is right for you.'
      }, {
        question: 'Occasionally you ask how I feel. Why?',
        answer: 'After a hard ride we will ask how you felt and adjust. We use your feedback to tweak our computations to help ensure you get sufficient rest and that we give you challenging but achievable goals. And if you feel that we are giving you too much or too little recovery time, go to My Profile and change your Rate of Recovery setting.'
      }, {
        question: 'Tacit Training keeps nagging me to do a threshold power test. How do I make it stop?',
        answer: '<p>By all means, do the test. Use your preferred testing protocol. If you do not have one, a common method  is to do two 8 minute TTs, take the one with the higher average power and multiply by .9. Another is to do a 20 minute time trial and then multiply your average power for the TT by .95. Google can help with the details.</p><p>Once you have your new Functional Threshold Power, you need to record it. If you have Strava FTP Sync turned on, enter your FTP in Strava under Settings | My Performance. Otherwise, enter the value and the test date on the My Profile page. If for some reason you cannot test, you can estimate your FTP by looking at a recent hard ride. And if you believe your FTP has not changed, you can simply update the test date on the My Profile page.</p><p>But it is always best to test. All the advice depends on a valid FTP value. Garbage in and all that.</p>'
      }]
    }, {
      sectionTitle: 'My Events',
      questions: [{
        question: 'I have multiple season goals. How do I set those up?',
        answer: 'Choose Schedule Events from the Training Days menu and specify that the event is a goal. After you create a goal be sure to go My Season and click Update Forecast to see how your new goal impacts your season. You can create as many goal events as you like and we will help you prepare for them.'
      }, {
        question: 'I have intermediate events that I do not plan to peak for but would like to include in my training. How do I set those up?',
        answer: 'Go to Training Days | Schedule Events to create intermediate events. On this page, in addition to goal event, you can create medium priority and low priority events. Be sure to update your season forecast after you add events.'
      }, {
        question: 'I have a club race every Tuesday night from April until September and a team ride every Thursday evening. Can I set these up as recurring events?',
        answer: 'Glad you asked! Go to Training Days | Schedule Events. Here you can create recurring medium and low priority events. After selecting a date and an event type, you can click the Repeat check-box to set up your recurring event. (Note that you cannot set up recurring Goal events.) And remember to update your season forecast after you add events. '
      }, {
        question: 'I have days I know I will not be able to ride. How do I tell Tacit Training about those days?',
        answer: 'In Tacit Training a scheduled day off is considered an event. Just like with riding events, you schedule your off-days by going to Training Days | Schedule Events. You can even create recurring off-days. And once again, remember to update your season forecast after you add them. '
      }]
    }, {
      sectionTitle: 'The Data',
      questions: [{
        question: 'How do I get my workout data into Tacit Training?',
        answer: 'Tacit Training needs your Training Load for each ride. Ideally we will have your ride data from Strava - see below for details. If for some reason your ride is not on Strava, on My Training Day you can manually enter the ride by clicking the + button. You can get Training Load (as TSS® - Training Stress Score®) from most head units or you can provide an estimate if actual data is not available. When estimating use rides of similar duration and intensity as a guide.'
      }, {
        question: 'How do I get my rides from Strava?',
        answer: 'Because your Tacit Training account is linked to your Strava account, you can either set your profile to automatically fetch your rides from Strava - on My Profile - or you can download your rides from Strava individually by clicking the Strava download button on My Training Day.'
      }, {
        question: 'My private activities in Strava are not showing up. How do I fix this?',
        answer: 'You need to log out and then log back into Tacit Training. When you log in Strava should ask you to authorize access of private events as part of the authorization process.'
      }, {
        question: 'I am missing some Strava rides. What should I do?',
        answer: 'Go to Sync Strava Activities on the Training Days menu. This will import any missing rides.'
      }, {
        question: 'The form and fitness numbers in Tacit Training do not seem right. How do I fix this?',
        answer: '<p>When you first start using Tacit Training, we create a season start day with default starting fitness and fatigue values. These values likely do not match your current fitness and fatigue. Over time your form and fitness values in Tacit Training will self-correct based on your ride data.</p><p>However, you can change the starting values in Tacit Training. To do this you create a new season start day. Go to the Training Days | Set/Reset Season Start menu. On this page you will need to select a new start day and input Fitness and Fatigue values for the day. If you are a Strava premium member, you can find these values in Strava on your Training | Fitness & Freshness page. You can also find these values in other training tools. If you do not have these values, we recommend you multiply the average number of hours you ride per week by 7 and use this number as your starting Fitness value. For Fatigue you can add 5 if you are feel rather tired, subtract 5 if you feel especially fresh, or use the same value if you feel neither.</p><p>After you create your new start day we will offer to download your Strava rides since your start. You should do this but before you do, you should make sure your FTP history on My Profile is up to date to ensure accurate reprocessing.</p>'
      }, {
        question: 'The load numbers as well as the form and fitness numbers in Tacit Training do not seem right. How do I fix this?',
        answer: '<p>Inaccurate load computations are usually due to incorrect FTP values. Go to My Profile and make sure your FTP history is (approximately) correct. If you make changes to FTP you need to re-sync your Strava ride data. Go to the Training Days | Sync Strava Activities menu. Select the "Replace previously synced activities" option and then click the Sync button. After the sync is complete, your load and fitness numbers should be correct.</p>'
      }, {
        question: 'I do not have a power meter on my mountain/cross/whatever bike. Can I still use Tacit Training?',
        answer: 'Yes you can. Strava provides estimated power for rides without power meter data using weight and elevations (<a href="https://support.strava.com/hc/en-us/articles/216919427-How-to-Get-Calculated-Power-for-Your-Rides" target="_blank">see here for how they do it</a>) and we use these estimates when actual power data is not available. If Strava does not provide either actual or estimated power, your ride will not be imported into Tacit Training. In this case you can manually enter a ride and provide an estimated Training Load. Use similar rides for which you have data as a guide for estimating.'
      }]
    }];
  }
);
// ]);
