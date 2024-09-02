//imports
const express = require("express");
const port = 3000;
const app = express();
const cors = require("cors");
const OpenAI = require("openai");
const fs= require('fs')
const path = require("path");
const process = require("process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");
const getSchedule = require("./calendarAPICall");
const { APIClient } = require("openai/core");
const trainingScript = require('./trainingScript')
require('dotenv').config()

//setup
app.use(cors());
app.use(express.json());

try {

  console.log('1. check if file exists')
  fs.readFileSync('test.json', 'utf-8')
} catch(e){
  console.log('2. file doesnt exist, writing it')
  fs.writeFileSync('hello.json', `
    "property": "one",
    "property2": "two"
`)
  
}

try {
  console.log('3. trying to read the file')
  const file = fs.readFileSync('hello.json', 'utf-8')
  console.log(file)
} catch(e){
  console.log('4. couldnt read the file')
}

//functions
const openai = new OpenAI({
  organization: process.env.organization,
  project: process.env.project,
  apiKey: process.env.apiKey,
  dangerouslyAllowBrowser: true,
});



//routes

//POST
app.post("/", async (req, res) => {
  
  console.log("incoming request:", req.body);

  let prevMsgHistory = [
    ...req.body.messageHistory,
  ];

  const completion = await openai.chat.completions.create({
    messages: [...trainingScript, ...prevMsgHistory],
    model: "gpt-4o-mini-2024-07-18",
    functions: [
      {
        name: "get_schedule",
        description:
          "Call this function to retrieve the bowling alleys daily schedule.",  
        parameters: {
          type: "object",
          properties: {
            date: {
              type: "string",
              format: "date-time",
              description:
                `The date for which the user is requesting information. For reference the current datetime is ${new Date()}, If the user implies a day with "tomorrow,  today, in 7 days etc..", calculate the correct date using the current datetime. `,
            },
          },
        },
      },
    ],
  });

  //if the get_schedule function is called...
  if (completion.choices[0].message.function_call?.name === "get_schedule") {
    console.log("gpt function call", completion.choices[0].message.function_call);

    //get the date the user is asking about

    const dateString = JSON.parse(
      completion.choices[0].message.function_call.arguments
    ).date.substring(0, 10);


    const dateObject = new Date(dateString);
 

    //get the schedule for the appropriate date
    const schedule = await getSchedule(dateObject);

    //add to the previous message history, a new system message that has the schedule
    prevMsgHistory.push({
      role: "system",
      content: `the user has previously asked a question regarding the schedule for which you called a function, that function retrieved the following schedule: ${schedule}, please respond to user's question with information about the number of lanes taken for given time blocks, not give any names or other specifics beyond total number of lanes taken for a given time block.`,
    });

    
    const APICompletion = await openai.chat.completions.create({
      messages: [...trainingScript, ...prevMsgHistory],
      model: "gpt-4o-mini-2024-07-18",
      functions: [
        {
          name: "get_schedule",
          description:
            "Get the bowling alley's daily schedule for the date in question.",
          parameters: {
            type: "object",
            properties: {
              date: {
                type: "string",
                format: "date-time",
                description:
                  `The date for which the user is requesting information. If the user requests date or time information in a verbal format such as 'tomorrow' or 'today' pass in the correct date based on today's date as ${new Date()}`,
              },
            },
          },
        },
      ],
    });

    console.log('api completion', APICompletion.choices[0].message)
    res.send(APICompletion.choices[0].message)
  } 
  //else just send the normal response
  else {
    console.log(completion.choices[0].message);
    res.send(completion.choices[0].message)
  }

  res.send();
});

app.listen(port);
console.log(`app is listening on port ${port}`);
