// HTTPS
var request = require('request')

// Encryption / Decryption
// const AWS = require('aws-sdk');
// const encrypted = process.env['STRAVA_ACCESS_TOKEN'];
// let decrypted;

// Stats List
const statsAvailable = 'longest ride, tallest ride, number of recent achievements, total number of rides and total distance'

const statisticsObject = {
    "longest ride" : "biggest_ride_distance",
    "tallest ride" : "biggest_climb_elevation_gain"
    /*,
    "number of recent achievements" : "achievement_count",
    "total number of rides" : "distance"*/
}

const profileObject = {
    "follower count" : "follower_count",
    "friend count" : "friend_count",
    "premium" : "premium"
}

var wantedStat = "";
var jsonObjectName = "";

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    /*console.log('STRAVA_ACCESS_TOKEN: '+encrypted)
    // Decrypt Strava Access Token
    if (decrypted) {
        //processEvent(event, context, callback);
        console.log('Access Token Decrypted')
    } else {
        // Decrypt code should run once and variables stored outside of the function
        // handler so that these are decrypted once per container
        const kms = new AWS.KMS();
        kms.decrypt({ CiphertextBlob: new Buffer(encrypted, 'base64') }, (err, data) => {
            if (err) {
                console.log('Decrypt error:', err);
                return callback(err);
            }
            decrypted = data.Plaintext.toString('ascii');
            console.log('Access Token Decrypted: '+decrypted)
        });
    }*/

    try {
        // console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */

    // if (event.session.application.applicationId !== "") {
    //     context.fail("Invalid Application ID");
    //  }

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    // add any session init logic here
}

/**
 * Called when the user invokes the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    getWelcomeResponse(callback)
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {

    var intent = intentRequest.intent
    var intentName = intentRequest.intent.name;

    // dispatch custom intents to handlers here
    if (intentName == "StatisticIntent") {
        handleStatisticResponse(intent, session, callback)
    } else {
         throw "Invalid intent"
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {

}

// ------- Skill specific logic -------

function getWelcomeResponse(callback) {
    var speechOutput = "Welcome! I can tell you your Strava data. Would you like to hear some stats? I can tell you about " + statsAvailable + " but i can only tell you about one at a time."

    var reprompt = "Do you want to hear some stats? I can tell you about " + statsAvailable

    var header = "Get Stats"

    var shouldEndSession = false

    var sessionAttributes = {
        "speechOutput" : speechOutput,
        "repromptText" : reprompt
    }

    callback(sessionAttributes, buildSpeechletResponse(header, speechOutput, reprompt, shouldEndSession))

}

function handleStatisticResponse(intent, session, callback) {

    var speechOutput = ''
    var repromptText = ''
    var header = ''

    wantedStat = intent.slots.Statistic.value
    jsonObjectName = wantedStat
    console.log('statisticsObject[wantedStat]: '+statisticsObject[wantedStat])

    if(statisticsObject[wantedStat]){
        console.log('statisticsObject[wantedStat]: '+statisticsObject[wantedStat]);
    }else if(profileObject[wantedStat]){
        console.log('profileObject[wantedStat]: '+profileObject[wantedStat]);
    }else{
        console.log('Non existant statistic from either data set');
        /*speechOutput = 'That statistic is not available'
        repromptText = 'Try another statistic'
        header = 'Non existant statistic'
        callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, "", true))*/
    }



    if(!statisticsObject[wantedStat]){
        // if stat doesnt exist etc
        console.log('Non existant statistic');
        speechOutput = 'That statistic is not available'
        repromptText = 'Try another statistic'
        header = 'Non existant statistic'
        callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, "", true))
    }else{
        // console.log('call getJSON');
        getJSON(function(data){
            if(data != 'ERROR') {
                speechOutput = data
                console.log('speechOutput: '+speechOutput)
            }
            callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, "", true))
        })
    }
}

/**
*   TO DO:
*   SETUP A WAY TO MANAGE THE VARIOUS API endpoint calls
*   testing started above, but not currently getting profile jsonData
**/

function urlAthlete(){
    console.log('urlAthlete');
    // return data using athlete url with access token
    return 'https://www.strava.com/api/v3/athlete?access_token=XXXXXXXXX'
}


function urlStatistics(){
    console.log('urlStatistics');
    // return data using athlete stats url with access token
    return 'https://www.strava.com/api/v3/athletes/22864/stats?access_token=XXXXXXXXX'
}


function getJSON(callback){
    console.log('getJSON ƒ')
    request.get(urlStatistics(), function(error, response, body){
        console.log('statusCode:', response && response.statusCode)
        var jsonData = JSON.parse(body)
        var getStat = statisticsObject[wantedStat].toString()
        console.log('getStat: '+getStat)
        console.log('jsonData[getStat]: '+jsonData[getStat])

        var result = jsonData[getStat]

        if(getStat == 'distance' || getStat == 'biggest_climb_elevation_gain' || getStat == 'biggest_ride_distance' ){
            var inMiles = getMiles(result)
            console.log('result in miles: '+inMiles)
            result = inMiles.toString() + " miles."
            console.log('final result: '+result)
        }

        if (result != undefined ) {
            callback(result);
        } else {
            callback('ERROR')
        }
    })
}

function getMiles(i) {
     return i*0.000621371192;
}
// ------- Helper functions to build responses for Alexa -------


function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}

function capitalizeFirst(s) {
    return s.charAt(0).toUpperCase() + s.slice(1)
}