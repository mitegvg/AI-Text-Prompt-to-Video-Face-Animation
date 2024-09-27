const OpenAI = require("openai");

const getOpenAIChat = async (message) => {
  const openaiKey = process.env.CHAT_GPT_KEY;
  try {
    console.log("openaiKey retrieved, length: ", openaiKey.length);
    const openai = new OpenAI({
      apiKey: openaiKey,
    });

    const systemMessages = [
      {
        role: "system",
        content:
          "Answer in short sentences in the style that is required. Don't use emoji. Answer in funny light-hearted manner. ",
      },
      {
        role: "assistant",
        content: `${message}`,
      },
    ];

    const joinedMessages = [...systemMessages];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: joinedMessages,
      temperature: 0.7,
      max_tokens: 400,
      n: 1,
      stop: null,
    });
    //console.log("completion.choices", completion.data);
    let content =
      completion.choices[0].message?.content || completion.choices[0].text;

    return content;
  } catch (error) {
    // Consider adjusting the error handling logic for your use case
    if (error.response) {
      console.error(error.response.status, error.response.data);
      return error.response.data;
    } else {
      console.error("Error with OpenAI API request: ", error);
      return {
        error: {
          message: "An error occurred during your request.",
        },
      };
    }
  }
};

module.exports = getOpenAIChat;
