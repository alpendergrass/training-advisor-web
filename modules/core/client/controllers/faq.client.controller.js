'use strict';

angular.module('core').controller('FAQController',
  function() {
    this.FAQ = [{
      sectionTitle: 'What is Tacit Training?',
      questions: [{
        question: 'What is it?',
        answer: 'Tacit Training is an app for cyclists that uses power data to provide a season-long plan and dispense training advice that will help you achieve your cycling objectives.'
      }, {
        question: 'What does Tacit Training give me?',
        answer: 'Tacit Training provides a season plan based on your current fitness, your goals and the training you do. It gives you daily advice on what your training day should look like and how much work you should do.'
      }, {
        question: 'Who is it for?',
        answer: 'Any cyclist that wants to go faster and/or further and uses a power meter. The app is structured around a training season with goal events, which is typically how competitive cyclists set up their training. But Tacit Training works for any cyclist. If you want to improve your cycling fitness, Tacit Training can help. Your goal can be any date on the calendar that you want to be at your best. One of our recent goal "events" was the start of a ten day mountain biking trip to Utah.'
      }, {
        question: 'So is Tacit Training right for me?',
        answer: '<p>It depends.</p><ul><li>Do you have a coach? If so, you do not need Tacit Training.</li><br><li>Do you enjoy spending time analyzing your ride data and planning your workouts? If so, then Tacit Training can help. The plan generation and what-if simulations can be very insightful. You should try it out for a week or two and see if it is for you.</li><br><li>If you are new to training as a cyclist, Tacit Training is definitely for you. Using the app is an excellent way to learn the ends and outs of training.</li><br><li>When we first conceived of Tacit Training, we were thinking of riders like us. We love to ride, we want to ride faster and go further, we want our time on the bike to be effective training, but we are often too busy to spend a lot of time planning and monitoring our training. If this sounds like you, Tacit Training can be a game-changer.</li>'
      }, {
        question: 'So what does Tacit Training do for YOU?',
        answer: 'In general it keeps our training on track. When the app suggests an easy day we are more likely to get on our bike than blow it off. When testing is due we are more likely to do it. But most of all we like knowing when we should ride and how much work we should do without having to spend a lot of time staring at numbers and graphs and trying to figure out what the data is telling us.'
      }, {
        question: 'What equipment do I need in order to use Tacit Training?',
        answer: '<p>You need a power meter on the bike you ride the most. Much of the functionality in the app relies on power data. You can estimate when needed, like if you do not have a power meter on your mountain or gravel bike, using other rides of similar intensity and duration as a guide.</p><p>And, ideally, you have a head unit that displays Training Load (typically as TSS® - Training Stress Score®) in real time. Most head units do these days. You can make effective use of Tacit Training without this but we like being able to see your training Load in real time.</p>'
      }, {
        question: 'How is Tacit Training different from other training tools?',
        answer: 'Most currently available tools focus on analysis of your workout data with charts, graphs and numbers. It is then up to you to figure out how to use those numbers to plan future training. Tacit Training automates much of this analysis and generates a season plan and dispenses advice based on that analysis. And unlike static training plans, the season plan created by Tacit Training can be regenerated at any time, taking into account the training you have done, any events you have added to your calendar and any off-days you have scheduled.'
      }]
    }, {
      sectionTitle: 'The Basics',
      questions: [{
        question: 'How do I use Tacit Training on a daily basis?',
        answer: '<p>Every day you should ask Tacit Training for advice. Tacit Training will advise you if you should ride or not and if so, what kind of ride to do. Tacit Training will also give you a suggested Training Load range for the day. While riding, you can monitor your Training Load (typically shown as TSS® - Training Stress Score®) in real-time on your head unit to stay within those parameters.</p><p>In addition to the advice you should frequently update your My Season page to see the big picture. This will help you understand how you are progressing and what is planned for future training days.</p>'
      }, {
        question: 'How do I get started? (Setting up my account)',
        answer: 'You create an account by linking to your Strava account. Click the Strava button on the sign in page, enter your Strava credentials and you are logged in.</p><p>You then need to enter some personal information on the My Profile Page. The most important bits are your time zone and your Functional Threshold Power and test date. We also recommend that you select "Fetch Strava activities automatically" to save you from having to download after every ride.</p>'
      }, {
        question: 'And then? (Setting start day)',
        answer: '<p>You need to create a start day by clicking the Start Day link on My Season or the Calendar. Your start day can be yesterday or today. When creating your start day you need to input Fitness and Fatigue values for the day. If you are a Strava premium member, you can find these values in Strava on your Training | Fitness & Freshness page. You can also find these values in other training tools. If you do not have these values, we recommend you multiply the average number of hours you ride per week by 7 and use this number as your starting Fitness value. For Fatigue you can add 5 if you are feel rather tired, subtract 5 if you feel especially fresh, or use the same value if you feel neither.</p><p>If you rode on or since your start day, download the ride from Strava or manually enter data for that ride. You do this on the page for the day the ride occurred. If needed, see the Ride Data section below for more on how to enter data.</p><p>Do not be concerned if you started training for the current season several days, weeks or months ago. We will calculate your season plan and advice using a virtual start day based on your first goal event.</p>'
      }, {
        question: 'Next? (Creating a goal event)',
        answer: 'You should create at least one future goal event. Click on the Goal Event link. For your goal event you can provide a Training Load estimate for the event. A reasonable guess will do but if you have no idea, leave it blank - you can true it up later once you have a better feel for Training Load.'
      }, {
        question: 'So now what? (Getting advice)',
        answer: '<p>If you rode on or after your start day, download the ride from Strava or manually enter data for that ride. You do this on the page for the day the ride occurred. If needed, see the Ride Data section below for more on how to enter data.</p><p>To get advice, click the Get Advice button. And there you go!</p>'
      }, {
        question: 'And after I ride? (Entering ride data)',
        answer: 'Tacit Training needs your Training Load for every ride you do. If you did not set up your profile to automatically fetch your ride data, on My Training Day you can download rides from Strava. You can also manually enter a ride by clicking the + button. See the Ride Data section below for more.'
      }, {
        question: 'I want the big picture! (Generating a season view)',
        answer: 'Go to My Season and click the Update Season button. This will update the season view using your latest ride data. And be sure to check out the What-If Simulator. This will let you see how your season will be affected by doing or skipping specific events or workouts. The buttons to run what-if simulations are at the bottom of the Season page.'
      }, {
        question: 'How do I use My Season?',
        answer: '<p>Use the chart to monitor your progress and to see what is in store for you. For future days it shows a plan that uses an average of the recommended load range. For past days it will display both plan and actual ride data.</p><p>The future is based on the assumption that you will follow the advice to the letter. However, we know no one will. You should frequently update your season so that it can take into account the work you have done. It will also incorporate any events or off-days you have scheduled.</p><p>If the Update Season button is red, that means some data has changed that could affect your season. Click the button.</p>'
      }]
    }, {
      sectionTitle: 'The Advice',
      questions: [{
        question: 'Do I have to always follow the advice in order to get any benefit? ',
        answer: 'No. Tacit Training does not know everything that is going on in your life. Or, most importantly, how you feel today. Do what you have to do, ride when you can but always pay attention to what your body is telling you. As long as you enter your ride data, Tacit Training will help keep you on track. We know you will not follow our advice every day but if we have the data we will adjust.'
      }, {
        question: 'Tacit Training says I should go easy today but I feel good, I want to hammer!  What should I do?',
        answer: 'By all means, go hard. You know how you feel. All we know are numbers and what you tell us. Note that on My Training Day, after you receive advice, you have the option of specifying that you want to do a different sort of ride than what we recommend. If you request a different ride, we will give you a Training Load range for that ride type.'
      }, {
        question: 'Tacit Training says I should go hard today but I’m too tired or I’m sick.  What should I do?',
        answer: 'Do what your body is telling you to do. If you need to rest, by all means REST. As with any advice you are given, only you can decide if it is right for you.'
      }, {
        question: 'Occasionally you ask how I feel. Why?',
        answer: 'After a hard ride we will ask how you felt and adjust. We use your feedback to tweak our computations to help ensure you get sufficient rest and that we give you challenging but achievable goals.'
      }, {
        question: 'Tacit Training keeps nagging me to do a threshold power test. How do I make it stop?',
        answer: '<p>By all means, do the test. Use your preferred testing protocol. If you do not have one, a common method is to do a 20 minute time trial and then multiply your average power for the TT by .95. Another is to do two 8 minute TTs, take the one with the higher average power and multiply by .9. Google can help with the details.</p><p>Once you have your new Functional Threshold Power, enter the value and the test date on the My Profile page. If for some reason you cannot test, you can estimate your FTP by looking at a recent hard ride. And if you believe your FTP has not changed, you can simply update the test date.</p><p>But it is always best to test. All the advice depends on a valid FTP value. Garbage in and all that.</p>'
      }]
    }, {
      sectionTitle: 'My Events',
      questions: [{
        question: 'I have multiple season goals. How do I set those up?',
        answer: 'Choose Schedule Events from the Training Days menu and specify that the event is a goal. After you create a goal be sure to go My Season and click Update Season to see how your new goal impacts your season. You can create as many goal events as you like and we will help you prepare for them.'
      }, {
        question: 'I have intermediate events that I do not plan to peak for but would like to include in my training. How do I set those up?',
        answer: 'Go to Training Days | Schedule Events to create intermediate events. On this page, in addition to goal event, you can create medium priority and low priority events. Be sure to update your season after you add events.'
      }, {
        question: 'I have a club race every Tuesday night from April until September and a team ride every Thursday evening. Can I set these up as recurring events?',
        answer: 'Glad you asked! Go to Training Days | Schedule Events. Here you can create recurring medium and low priority events. After selecting a date and an event type, you can click the Repeat check-box to set up your recurring event. (Note that you cannot set up recurring Goal events.) And remember to update your season after you add events. '
      }, {
        question: 'I have days I know I will not be able to ride. How do I tell Tacit Training about those days?',
        answer: 'In Tacit Training a scheduled day off is considered an event. Just like with riding events, you schedule your off-days by going to Training Days | Schedule Events. You can even create recurring off-days. And once again, remember to update your season after you add them. '
      }]
    }, {
      sectionTitle: 'Ride Data',
      questions: [{
        question: 'How do I get my workout data into Tacit Training?',
        answer: 'Tacit Training needs your Training Load for each ride. Ideally we will have your ride data from Strava - see below for details. If for some reason your ride is not on Strava, on My Training Day you can manually enter the ride by clicking the + button. You can get Training Load (as TSS® - Training Stress Score®) from most head units or you can provide an estimate if actual data is not available. When estimating use rides of similar duration and intensity as a guide.'
      }, {
        question: 'How do I get my rides from Strava?',
        answer: 'Because your Tacit Training account is linked to your Strava account, you can either set your profile to automatically fetch your rides from Strava - on My Profile - or you can download your rides from Strava individually. Click the Strava download button on My Training Day.'
      }, {
        question: 'I have not input my rides into Tacit Training for a day/week/month or two but I want to start using it again. Do I have to input all the workouts I’ve done since the last time I used it?',
        answer: 'No. You need to do a Fitness and Fatigue True-Up - see the Training Days menu.'
      }, {
        question: 'Why are my Fitness, Fatigue and Form numbers in Tacit Training higher than in Strava?',
        answer: 'One of our goals is to give you a Training Load recommendation that you can monitor in real time on your head unit. Due to the way Strava processes raw activity data, one of the values from your Strava ride data tends to run lower than the corresponding value your head unit uses to compute Training Load. We adjust this value when computing Training Load (which affects Fitness, Fatigue and Form) using an average of the difference we’ve measured over time. It will not be exact but we believe it is close enough.'
      }, {
        question: 'I do not have a power meter on my mountain/cross/whatever bike. Can I still use Tacit Training?',
        answer: 'You can but will have to estimate your Training Load. You can compare your duration and perceived intensity with similar rides for which you have data and use that. Alternatively, Strava will estimate Training Load using heart rate data. As long as you are reasonably close our advice will be valid.'
      }]
    }];
  }
);
// ]);
