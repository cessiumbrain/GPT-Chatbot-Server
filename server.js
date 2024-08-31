//imports
const express = require("express");
const port = 3000;
const app = express();
const cors = require("cors");
const OpenAI = require("openai");

const fs = require("fs").promises;
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

if(fs.existsSync('credentials.json')){
  console.log('test.json already exists')
  return
} else {
  fs.writeFile('credentials.json', `{
      "installed": {
        "client_id": "598552846928-9alljq4igop0qbbjl1pt1or3ffmlum9v.apps.googleusercontent.com",
        "project_id": "calendar-api-430519",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_secret": "${process.env.client_secret}",
        "redirect_uris": ["http://localhost, https://gpt-chatbot-server-navy.vercel.app/"]
      }
    }
    `, (err)=>console.log(err))
}

//functions
const openai = new OpenAI({
  organization: process.env.organization,
  project: process.env.project,
  apiKey: process.env.apiKey,
  dangerouslyAllowBrowser: true,
});



//routes

//
app.post("/", async (req, res) => {
  
  console.log("incoming request");

  let prevMsgHistory = [
    { role: "user", content: "What is your schedule like for today?" },
  ];

  const completion = await openai.chat.completions.create({
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
                "The date for which the user is requesting information.",
            },
          },
        },
      },
    ],
  });

  if (completion.choices[0].message.function_call?.name === "get_schedule") {
    console.log("gpt function call", console.log(completion.choices[0]));

    //get the date the user is asking about

    const dateString = JSON.parse(
      completion.choices[0].message.function_call.arguments
    ).date.substring(0, 10);

    const dateObject = new Date(dateString);

    //get the schedule for the appropriate date
    const schedule = await getSchedule(dateObject);
      console.log('schedule', schedule)
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
                  "The date for which the user is requesting information.",
              },
            },
          },
        },
      ],
    });

    console.log('api completion', APICompletion.choices[0].message)
  } else {
    console.log(completion.choices[0].message);
  }

  res.send();
});

app.get("/", async(req, res)=>{
  console.log('get request')
  res.send("zzz")
})

app.listen(port);
console.log(`app is listening on port ${port}`);
