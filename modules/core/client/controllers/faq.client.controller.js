'use strict';

angular.module('core').controller('FAQController', ['$scope', '$sce', 'Authentication',
  function($scope, $sce, Authentication) {
    // This provides Authentication context.
    $scope.authentication = Authentication;
    $scope.FAQ = [{
      sectionTitle: 'What is Tacit Training?',
      questions: [{
        question: 'What is it?',
        answer: 'Tacit Training is an app for cyclists that uses power data to provide a training plan and dispense training advice that will help you achieve your cycling objectives.'
      }, {
        question: 'What does Tacit Training give me?',
        answer: 'Tacit Training provides a training plan based on your current fitness, your goals and the training you do. It gives you daily advice on what your training day should look like and how much work you should do.'
      }, {
        question: 'Who is it for?',
        answer: 'Any cyclist that wants to go faster or longer and uses a power meter. The app is structured around a training season with goal events, which is typically how competitive cyclists set up their training. But Tacit Training works for any cyclist. If you want to improve your cycling fitness, Tacit Training can help. Your goal can be any date on the calendar that you want to be at your best. One of our recent goal “events” was the start of a ten day mountain biking trip to Utah.'
      }, {
        question: 'So is Tacit Training right for me?',
        answer: '<p>It depends. Do you work with a coach? If so, you do not need Tacit Training.</p><p>Do you enjoy spending time analyzing your ride data and planning your workouts? If so, then Tacit Training can help. The plan generation and what-if simulations can be very insightful. <p>If you are new to training as a cyclist, Tacit Training is definitely for you. Or if you are like us and are too busy or otherwise disinclined to spend a lot of time planning and monitoring your training then Tacit Training can be a game-changer.</p>'
      }, {
        question: 'So what does Tacit Training do for you?',
        answer: 'In general it keeps our training on track. When the app suggests an easy day we are more likely to get on our bike than blow it off. When testing is due we are more likely to do it. But in general the most important benefit is it helps us know how much work we need to do in our training without having to spend a lot of time staring at numbers and graphs and trying to figure out what the data is telling us.'
      }, {
        question: 'What equipment do I need in order to use Tacit Training?',
        answer: 'You need a power meter on your bike and, ideally, a head unit that displays Training Load (typically as TSS® - Training Stress Score®) in real time. Most head units do these days.'
      }, {
        question: 'How is Tacit Training different from other training tools?',
        answer: 'Most currently available tools focus on analysis of your workout data with charts, graphs and numbers. It is then up to you to figure out how to use those numbers to plan future training. Tacit Training automates some of this analysis and generates a plan and dispenses advice based on that analysis. And unlike static training plans, the plan created by Tacit Training can be regenerated at any time, taking into account the training you have done and any events you have added to your calendar.'
      }]
    }, {
      sectionTitle: 'The Basics',
      questions: [{
        question: 'How do I use Tacit Training on a daily basis?',
        answer: '<p>For every ride you do you need to download your ride from Strava or manually enter your Training Load for the ride. Then on a daily basis you should ask Tacit Training to give you advice for the day. Tacit Training will advise you if you should ride or not and if so, what kind of ride to do.</p><p>Tacit Training will also give you a suggested Training Load range for the day. While riding, you can monitor your Training Load (typically shown as TSS® - Training Stress Score®) in real-time on your head unit to stay within those parameters.</p><p>In addition to the advice you should frequently update your Training Plan on the My Season page to see the big picture. This will help you understand how you are progressing and what is planned for future training days.</p>'
      }, {
        question: 'How do I get started? (Setting up my account)',
        answer: 'You create an account by linking to your Strava account. Click the Strava button on the sign in page, enter your Strava credentials and you are logged in.</p><p>You then need to enter some personal information on the My Profile Page. The most important bit is your Functional Threshold Power and your FTP test date.</p>'
      }, {
        question: 'And then? (Setting start day)',
        answer: '<p>You need to create a start day by clicking the "Start Day" link on My Season or My Calendar. Your start day should be the day you start using Tacit Training. When creating your start day you need to input Fitness and Fatigue values for the day. You can find these values on your Training | Fitness & Freshness page in Strava.</p><p>If you have ridden since your start day, download the ride from Strava or manually enter data for that ride. You do this on the page for the day the ride occurred. If needed, see the "Ride Data" section below for more on how to enter data.</p><p>Do not be concerned if you started training for the current season several days, weeks or months ago. We will calculate your plan and advice using a virtual start day based on your first goal event.</p>'
      }, {
        question: 'Next? (Creating a goal event)',
        answer: 'You should create at least one future goal event. Click on the "Goal Event" link. For your goal event you should provide a Training Load estimate for the event. A reasonable guess is will do but if you have no idea, leave it blank - you can true it up later once you have a better feel for Training Load.'
      }, {
        question: 'So now what? (Getting advice)',
        answer: 'Then select "Get Advice" from the Training Days menu. On this page you will be able to select today or tomorrow. Make you selection and click the "Get Advice" button. And there you go!'
      }, {
        question: 'And after I ride? (Entering ride data)',
        answer: 'Tacit Training needs your Training Load for every ride you do. On the Training Day page for the day you can download rides from Strava. You can also manually enter a ride by clicking the + button. See the "Ride Data" section below for more.'
      }, {
        question: 'I want the big picture! (Generating a training plan)',
        answer: 'Go to My Season and click the "Update Plan" button. This will update the season view using your latest ride data. If you do not see the button this means that your plan is current. And be sure to check out the What-If Simulator. This will let you see how your plan will be affected by doing or skipping specific events or workouts. The buttons to run what-if simulations are at the bottom of the My Season page.'
      }, {
        question: 'How do I use the Training Plan on the My Season page?',
        answer: '<p>Use the plan to monitor your progress and to see what is in store for you. For past days it will display actual ride data. For future days it uses an average of the recommended load range.</p><p>The future is based on the assumption that you will follow the advice to the letter. However, we know no one will. You should frequently update your training plan so that it can take into account the work you have done. It will also incorporate into your plan any events you have scheduled.</p><p>If you see an "Update Plan" button, that means some data has changed that could affect your plan. Click the button.</p>'
      }]
    }, {
      sectionTitle: 'The Advice',
      questions: [{
        question: 'Do I have to always follow the advice in order to get any benefit? ',
        answer: 'No. Tacit Training has no way of knowing that you have to put your car in the shop today or that you plan to call in sick tomorrow and ride. Or, most importantly, how you feel today. Do what you have to do, ride when you can but always pay attention to what your body is telling you. As long as you enter your ride data, Tacit Training will help keep you on track. You may or may not follow our advice but if we have the data we will adjust.'
      }, {
        question: 'Tacit Training says I should go easy today but I feel good, I want to hammer!  What should I do?',
        answer: 'By all means, go hard. You know how you feel. All we know are numbers and what you tell us. Note that on the Training Day page after you receive advice you have the option of specifying that you want to do a different sort of ride than what we recommend. If you request a different sort of ride, we will give you a Training Load range for that ride type.'
      }, {
        question: 'Tacit Training says I should go hard today but I’m too tired or I’m sick.  What should I do?',
        answer: 'Do what your body is telling you to do. If you need to rest, REST. As with any advice you are given, it is your responsibility to decide if it is right for you.'
      }, {
        question: 'Occasionally you ask how I feel. Why?',
        answer: 'After a hard ride we will ask how you felt and adjust. We use your feedback to tweak our computations to help ensure your get sufficient rest and we give you challenging but achievable goals.'
      }, {
        question: 'Tacit Training keeps nagging me to do a threshold power test. How do I make it stop?',
        answer: 'Do the test. Then enter your new Functional Threshold Power and the test date on the My Profile page. If for some reason you cannot test, you can estimate your FTP by looking at a recent hard ride in your preferred analysis tool. And if you believe your FTP has not changed, you can simply update the test date. But it is always best to test. All the advice depends on a valid FTP value. Garbage in and all that.'
      }]
    }, {
      sectionTitle: 'My Goals',
      questions: [{
        question: 'I have multiple season goals. How do I set those up?',
        answer: 'Choose "Schedule Events" from the Training Days menu and specify that it is a goal. After you create a goal be sure to go the My Season and click Update Plan to see how your new goal impacts your plan. You can create as many goal events as you like and we will help you prepare for them. However, we will not warn you if we think you are being overly ambitious.'
      }, {
        question: 'I have intermediate events that I do not plan to peak for but would like to give them my best shot. How do I set those up?',
        answer: 'Go to Training Days | Schedule Events to create intermediate events. On this page you can create medium priority and low priority events as well as additional Goal events. Be sure to update your plan after you add events.'
      }, {
        question: 'I have a club race every Tuesday night from April until September and a team ride every Thursday evening. Can I set these up as recurring/repeating events?',
        answer: 'Glad you asked! Go to Training Days | Schedule Events. Here you can create recurring medium and low priority events. After selecting a date and an event type, you can click the Repeat check-box to set up your recurring event. And remember, update your plan after you add events. Note that you cannot set up recurring Goal events.'
      }]
    }, {
      sectionTitle: 'Ride Data',
      questions: [{
        question: 'How do I get my workout data into Tacit Training?',
        answer: 'Tacit Training needs your Training Load for each ride. Ideally you will download your ride from Strava - see below for details. If for some reason you cannot download a ride, on the Training Day page you can manually enter the ride by clicking the + button. You can get Training Load (as TSS® - Training Stress Score®) from most head units or you can provide an estimate if actual data is not available.'
      }, {
        question: 'How do I download my rides from Strava?',
        answer: 'Because your Tacit Training account is linked to your Strava account, you are set up to download your rides from Strava from within Tacit Training. Click the Strava download button on the Training Day page.'
      }, {
        question: 'I have not input my rides into Tacit Training for a day/week/month or two but I want to start using it again. Do I have to input all the workouts I’ve done since the last time I used it?',
        answer: 'No. You need to do a Mid-Season True-Up - see the Training Days menu.'
      }, {
        question: 'Why are my Fitness, Fatigue and Form numbers in Tacit Training higher than in Strava?',
        answer: 'One of our goals is to give you a Training Load recommendation that you can monitor in real time on your head unit. Due to the way Strava processes raw activity data, one of the values from your Strava ride data tends to run lower than the corresponding value your head unit uses to compute Training Load. We adjust this value when computing Training Load (which affects Fitness, Fatigue and Form) using an average of the difference we’ve measured over time. It will not be exact but we believe it is close enough.'
      }, {
        question: 'I do not have a power meter on my mountain/cross/whatever bike. Can I still use Tacit Training?',
        answer: 'You can but will have to estimate your Training Load. You can compare your duration and perceived intensity with similar rides for which you have data and use that. Alternatively, Strava will estimate Training Load using heart rate data. As long as you are reasonably close our advice will be valid.'
      }]
    }];
  }
]);
