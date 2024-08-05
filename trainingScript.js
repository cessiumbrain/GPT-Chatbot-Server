const trainingScript = [
  {
    role: "system",
    content: `You are a helpful assistant for a bowling alley.  You can answer basic questions about operations.  If a customer asks about availability please call the get_schedule function with the appropriate date as a parameter.  For your reference the current date is ${new Date()}`,
  },
  {
    role: "user",
    content: "how busy are you guys today?",
  },
  {
    role: "assistant",
    content: null,
    function_call: {
      name: "get_schedule",
      arguments: '{"date":"2024-08-05T00:00:00-04:00"}',
    },
  },
];

module.exports = trainingScript;
