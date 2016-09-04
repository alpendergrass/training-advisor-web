'use strict';

angular.module('core').controller('AboutController', ['$scope', 'Authentication',
  function($scope, Authentication) {
    // This provides Authentication context.
    $scope.authentication = Authentication;
    $scope.FAQ = [{
      sectionTitle: 'What is Tacit Training?',
      questions: [{
        question: 'What is it?',
        answer: 'Tacit Training is an app for cyclists that dispenses training advice that will help you understand what you need to do on a daily basis in order to achieve your cycling objectives.'
      }, {
        question: 'What does Tacit Training give me?',
        answer: 'Tacit Training gives you daily advice on what your training day should look like and how much work you should do. Tacit Training does not give you specific workouts like hill repeats or sprint intervals.'
      }, {
        question: 'Who is it for?',
        answer: 'Any cyclist that wants to go faster or longer. The app is structured around a training season with goal events, which is typically how competitive cyclists structure their training. That said, if you are a cyclist that wants to improve your fitness, Tacit Training can help. Your goal can be any date on the calendar that you want to be at your best. One of our goal “events” is the start of a ten day mountain biking trip to Moab.'
      }, {
        question: 'So is Tacit Training right for me?',
        answer: 'Do you work with a coach? If so, you do not need Dr. Tacit. Do you enjoy spending time analyzing your ride data and planning your workouts? If so, then Tacit Training may help. You should try it for a week or two and see it it adds value. However, if you are like us and are too busy or lazy or otherwise disinclined to spend a lot of time planning and monitoring your training then Tacit Training is for you.'
      }, {
        question: 'So what does Tacit Training do for you?',
        answer: 'In general it keeps our training on track. When the app suggests an easy day we are more likely to get on my bike than blow it off. When testing is due we are more likely to do it. But in general the most important benefit is it helps us know how much work need to do in our training without having to spend a lot of time staring at numbers and graphs and trying to figure out what the data is telling us.'
      }, {
        question: 'How is Tacit Training different from other training tools?',
        answer: 'Most currently available tools focus on analysis of your workout data with charts, graphs and numbers. It is then up to you to figure out how to use those numbers to plan future training. Tacit Training automates portions of this analysis and dispenses advice based on that analysis.'
      }, {
        question: 'If I use Tacit Training do I need those other tools?',
        answer: 'That depends on you. We find that we spend much less time than we used to looking at historical data. That said, we sometimes look at specific events in our training to see if the numbers correspond to how we felt that day. We also look at trends in these other tools to see if they support what Tacit Training is advising us to do. And truth be told, sometimes we just like to geek out on data. We just know that we do not have to do that on a daily basis in order to stay on track.'
      }]
    }, {
      sectionTitle: 'The Basics',
      questions: [{
        question: 'What equipment do I need in order to use Tacit Training?',
        answer: 'You need a power meter on your bike and, ideally, a head unit that displays Load (TSS®) in real time. Most head units do these days.'
      }, {
        question: 'How do I use Tacit Training on a daily basis?',
        answer: 'For every workout you need to either download your ride (from TrainingPeaks® or Strava) or manually enter your Training Load (TSS®) for the ride. Then on a daily basis you should ask Tacit Training to give you advice for the day. Tacit Training will advise you if you should ride or not and if so, what kind of ride to do. Tacit Training will also give you a suggested Load/TSS® range for the day. You can monitor your TSS® in real-time on your head unit to stay within those parameters.'
      }, {
        question: 'How do I get started? (Creating an account)',
        answer: 'First you have to create an account. You can do this the regular way by creating a username and password or by linking to your Strava account.'
      }, {
        question: 'Then what? (Entering personal info)',
        answer: 'You need to enter some personal information. Personal info is entered on the My Profile Page. The most important bit is your Functional Threshold Power and your FTP test date.'
      }, {
        question: 'And then? (Setting start day)',
        answer: 'You need to create a start day by clicking the "Start Season" link on the My Training Days page. Your start day should be the day you start using Tacit Training. When creating your start day you need to input Form (CTL) and Fitness (ATL) values for the day.'
      }, {
        question: 'Anything else? (Creating a goal event)',
        answer: 'You should create at least one future goal event. (If you have no goal the app will assume your are in transition and let you slack off.) Click on the "Goal Event" link on the My Training Days page  For your goal event you need to provide a Load (TSS®) estimate for the event. If you have no idea, enter 200 - you can true it up later once you have a better feel for Load.'
      }, {
        question: 'So now what? (Getting advice)',
        answer: 'Select "Get Advice" from the Training Days menu. On this page you will be able to select today or tomorrow. Make you selection and click the "Get Advice" button. And there you go!'
      }, {
        question: 'And after I ride? (Entering ride data)',
        answer: 'Tacit Training needs your training load (TSS®) for every ride you do. On the Training Day page for the day you can manually enter a ride by clicking the + button. For the ride you will enter total load (TSS®) for the ride. You can also download rides from TrainingPeaks® or Strava. See the "Ride Data" section below for more.'
      }]
    }, {
      sectionTitle: 'The Advice',
      questions: [{
        question: 'Do I have to always follow the advice in order to get any benefit? ',
        answer: 'No. Tacit Training has no way of knowing that you have to put your car in the shop today or that you plan to call in sick tomorrow and ride. Or, most importantly, how you feel today. Do what you have to do, ride when you can but always pay attention to what your body is telling you. As long as you enter your ride data, Tacit Training will help keep you on track. You may or may not follow our advice but if we have the data we will adjust.'
      }, {
        question: 'Tacit Training says I should go hard today but I’m too tired or I’m sick.  What should I do?',
        answer: 'Do what your body is telling you to do. If you need to rest, REST. As with any advice you are given, it is your responsibility to decide if it is right for you.'
      }, {
        question: 'Tacit Training says I should go easy today but I feel good, I want to hammer!  What should I do?',
        answer: 'By all means, go hard. You know how you feel. All we know are numbers and what you tell us. After a hard ride we will ask how you felt and adjust.'
      }, {
        question: 'Occasionally you ask how I feel. Why?',
        answer: 'We use your feedback to tweak our computations to help ensure your get sufficient rest and we give you challenging but achievable goals.'
      }, {
        question: 'Tacit Training keeps nagging me to do a threshold power test. How do I make it stop?',
        answer: 'Do the test. Then enter your new Functional Threshold Power and the test date on the My Profile page. If for some reason you cannot test, you can estimate your FTP by looking at a recent hard ride in your preferred analysis tool. And if you believe your FTP has not changed, you can simply update the test date. But it is always best to test. All the advice depends on a valid FTP value. Garbage in and all that.'
      }]
    }, {
      sectionTitle: 'My Goals',
      questions: [{
        question: 'I have multiple season goals. How do I set those up?',
        answer: 'Choose "Schedule Events" from the Training Days menu and specify that it is a goal. You can create as many goal events as you like and we will help you prepare for them. However, we will not warn you (yet) if we think you are being overly ambitious.'
      }, {
        question: 'I have intermediate events that I do not plan to peak for but would like to give them my best shot. How do I set those up?',
        answer: 'Go to Training Days | Schedule Events to create intermediate events. On this page you can create medium priority events, low priority (low priority) events as well as additional Goal events.'
      }, {
        question: 'I have a club race every Tuesday night from April until September and a team ride every Thursday evening. Can I set these up as recurring/repeating events?',
        answer: 'Glad you asked! Go to Training Days | Schedule Events. Here you can create recurring medium priority and low priority (low priority) events. After selecting a date and an event type, you can click the Repeat checkbox to set up your recurring event. Note that you cannot set up recurring Goal events.'
      }]
    }, {
      sectionTitle: 'Ride Data',
      questions: [{
        question: 'How do I get my workout data into Tacit Training?',
        answer: 'Tacit Training needs your training load (TSS®) for each ride. On the Training Day page you can manually enter the ride by clicking the + button on the Training Day page. You can get Training Load (TSS®) from your most head units or from any app or website into which you import your data: Garmin Connect, Training Peaks, PowerTap Power Agent, Golden Cheetah, Strava, whatever. I recommend that if possible you use the same source each time though as they all vary somewhat. You can also download your ride from TrainingPeaks® or Strava (see below for details). '
      }, {
        question: 'How do I get my rides from TrainingPeaks®?',
        answer: 'On your My Profile page you must enter your TrainingPeaks® credentials and indicate the type of account you have. Once you do this a TrainingPeaks® download button will appear on the daily detail page. Note, however, that only TrainingPeaks® premium account types allow data download. If you have one of the free account types the download feature will not work.'
      }, {
        question: 'How do I get my rides from Strava?',
        answer: 'If you have a Strava account and upload your rides to Strava, you can link your Tacit Training account to your Strava account and download your rides from Strava from within Tacit Training. If you used your Strava account to set up your Tacit Training account, you are already linked. If you created a Tacit Training username and password, you can link your Strava account from the Manage Social Accounts page. Once you link your Strava account a Strava download button will appear on the daily details page.'
      }, {
        question: 'I have not input my rides into Tacit Training for a day/week/month/year or two but I want to start using it again. Do I have to input all the workouts I’ve done since the last time I used it?',
        answer: 'No. You need to do a Mid-Season True-Up - see the Training Days menu.'
      }, {
        question: 'I download my rides from Strava. Why are my Fitness and Fatigue numbers in Tacit Training higher than in Strava?',
        answer: 'Due to the way Strava processes raw activity data, their numbers tend to run lower than what your head unit and most of the other sources report. Because we want to be able to monitor Load in real time on our head unit, we attempt to compensate by applying what we call the Strava fudge factor which will bring the Strava numbers closer to the other sources. The fudge factor is an average of the difference we’ve measured over time. It will not be exact.'
      }, {
        question: 'My ride data comes from TrainingPeaks®/Garmin Connect. At first my numbers in Tacit Training were the same but now my Fatigue (ATL) numbers have started to diverge. Why is that?',
        answer: 'Based on the feedback you’ve provided we have made adjustments to the calculations we use for your recommendations. Depending on what you’ve told us this could cause Fatigue (ATL) to be higher or lower in Tacit Training when compared to TrainingPeaks® or Garmin Connect.'
      }, {
        question: 'I do not have a power meter on my mountain/cross/whatever bike. Can I still use Tacit Training?',
        answer: 'You can but will have to estimate your training load. You can compare your duration and perceived intensity with similar rides for which you have data and use that (that’s what we do). Alternatively, some tools will estimate Load using heart rate data. As long as you are reasonably close our advice will be valid.'
      }, {
        question: 'I do not have a power meter. Can I use my heart rate monitor?',
        answer: 'Not really. We haven’t put a lot of thought into how to use HR data. That said, if the demand is there we will try to figure it out. Let us know if this is important to you.'
      }]
    }];
  }
]);
