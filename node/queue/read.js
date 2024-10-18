const {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} = require("@aws-sdk/client-sqs"); // ES Modules import
const createSound = require("../polly");
const path = require("path");
const spawn = require("child_process").spawn;
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
// const { SQSClient, ReceiveMessageCommand } = require("@aws-sdk/client-sqs"); // CommonJS import

const REGION = "us-east-1"; //e.g. "us-east-1"
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const QUEUE_URL = process.env.QUEUE_URL;
const BUCKET_NAME = process.env.BUCKET_NAME;

const receiveMessagesFromQueue = async () => {
  try {
    const queueURL = QUEUE_URL;

    const client = new SQSClient({
      region: REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });
    const input = {
      AttributeNames: ["SentTimestamp"],
      MaxNumberOfMessages: 1,
      MessageAttributeNames: ["All"],
      QueueUrl: queueURL,
      VisibilityTimeout: 10000,
      WaitTimeSeconds: 0,
    };
    const command = new ReceiveMessageCommand(input);
    const response = await client.send(command);

    if (!response.Messages || response.Messages.length === 0) {
      console.log("No messages found");
      setTimeout(() => receiveMessagesFromQueue(), 10000);
      return;
    }
    const data = JSON.parse(response.Messages[0].Body);
    console.log("PROCESSING -> ", response.Body);
    const title = data.text.replaceAll(" ", "-");
    await createSound(data.text, "Chris Hemsworth");
    const pythonProcess = spawn("python", [
      "./main_end2end.py",
      "--jpg=" + data.name + "-" + data.scene + "-poster.jpg",
    ]);
    pythonProcess.stdout.on("data", (data) => {
      console.log(data.toString());
    });

    pythonProcess.stdout.on("close", async () => {
      const videoTitle = data.name + "/" + data.scene + "/" + title;
      console.log("video created", videoTitle);
      await readSendS3(videoTitle);

      var deleteParams = {
        QueueUrl: queueURL,
        ReceiptHandle: response.Messages[0].ReceiptHandle,
      };

      const deleteCommand = new DeleteMessageCommand(deleteParams);
      const responseDelete = await client.send(deleteCommand);
      console.log("deleted");
      setTimeout(() => receiveMessagesFromQueue(), 10000);
    });
  } catch (e) {
    console.log(e);
    setTimeout(() => receiveMessagesFromQueue(), 10000);
  }
};

// Reading from the local file
// sending to s3
const readSendS3 = async (videoTitle) => {
  try {
    const s3 = new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });
    const data = fs.readFileSync(
      path.resolve(__dirname, "../../examples/output/prompt.mp4")
    );

    var params = {
      Body: Buffer.from(data, "binary"),
      ContentType: "video/mp4",
      Bucket: BUCKET_NAME,
      Key: videoTitle + ".mp4",
      ServerSideEncryption: "AES256",
      StorageClass: "STANDARD_IA",
    };
    console.log("params", params);
    const s3command = new PutObjectCommand(params);
    const s3Object = await s3.send(s3command);
    console.log("s3Object saved", s3Object);
    fs.unlink(
      path.resolve(__dirname, "../../examples/output/prompt.mp4"),
      (res) => console.log(res)
    );
  } catch (e) {
    console.log(e);
    return;
  }
};

module.exports = { receiveMessagesFromQueue, readSendS3 };
