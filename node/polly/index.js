const {
  PollyClient,
  SynthesizeSpeechCommand,
} = require("@aws-sdk/client-polly");

const { Readable } = require("stream");
const fs = require("fs");
const Lame = require("node-lame").Lame;

// Set the AWS Region.
const REGION = "us-east-1"; //e.g. "us-east-1"

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
// Create an Amazon S3 service client object.
const pollyClient = new PollyClient({
  region: REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});
// snippet-end:[polly.JavaScript.createclientv3]

let i = 0;

const createSound = (prompt, style) => {
  return new Promise(async (resolve) => {
    const params = {
      Text: prompt,
      TextType: "text",
      VoiceId: style === "Chris Hemsworth" ? "Russell" : "Ruth",
      SampleRate: "24000",
      OutputFormat: "mp3",
      Engine: style === "Chris Hemsworth" ? "standard" : "generative",
    };

    try {
      const data = await pollyClient.send(new SynthesizeSpeechCommand(params));

      if (data.AudioStream instanceof Readable) {
        data.AudioStream.pipe(fs.createWriteStream(`examples/output.mp3`));
        setTimeout(() => {
          const decoder = new Lame({
            output: `examples/prompt.wav`,
          }).setFile("examples/output.mp3");
          console.log("decoding sound");
          decoder
            .decode()
            .then(() => {
              console.log("decoding done");
              resolve();
              // Decoding finished
            })
            .catch((error) => {
              console.log("error", error);
              // Something went wrong
            });
        }, 3000);
      } else {
        console.log("no Readable");
      }
    } catch (err) {
      console.log("Error putting object", err);
    }
  });
};

module.exports = createSound;
