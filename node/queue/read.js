const {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} = require("@aws-sdk/client-sqs"); // ES Modules import
const path = require("path");
const spawn = require("child_process").spawn;
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const { getSoundFromExternalSource } = require("./getSoundFromExternalSource");
// const { SQSClient, ReceiveMessageCommand } = require("@aws-sdk/client-sqs"); // CommonJS import

const REGION = "us-east-1"; //e.g. "us-east-1"
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const QUEUE_URL = process.env.QUEUE_URL;
const BUCKET_NAME = process.env.BUCKET_NAME;
const VISIBILITY_TIMEOUT_SECONDS =
  process.env.VISIBILITY_TIMEOUT_SECONDS || 500;
const GET_MESSAGE_TIMEOUT_MS = process.env.GET_MESSAGE_TIMEOUT_MS || 2000;

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
      VisibilityTimeout: VISIBILITY_TIMEOUT_SECONDS,
      WaitTimeSeconds: 0,
    };
    const command = new ReceiveMessageCommand(input);
    const response = await client.send(command);

    if (!response.Messages || response.Messages.length === 0) {
      console.log("No messages found");
      setTimeout(() => receiveMessagesFromQueue(), GET_MESSAGE_TIMEOUT_MS);
      return;
    }
    const data = JSON.parse(response.Messages[0].Body);
    console.log("PROCESSING -> ", response.Messages[0].MessageId);
    const title = data.text.replaceAll(" ", "-");
    const image = fs.existsSync(
      path.resolve(
        __dirname,
        `../../examples/${data.name}-${data.scene}-poster.jpg`
      )
    );
    if (!image) {
      console.log("image not found");
      return;
    }

    const url = `${process.env.STORAGE_ENDPOINT}/${
      data.id
    }-${encodeURIComponent(title)}.mp3`;
    await getSoundFromExternalSource(url);
    console.log("location", path.resolve(__dirname, "../../main_end2end.py"));
    const pythonProcess = spawn(
      "/opt/conda/envs/face_anim/bin/python",
      [
        "main_end2end.py",
        "--jpg=" + data.name + "-" + data.scene + "-poster.jpg",
      ],
      {
        cwd: path.resolve(__dirname, "../.."),
      }
    );
    pythonProcess.stderr.on("data", (data) => {
      //Here data is of type buffer
      console.log(data.toString());
    });

    pythonProcess.stdout.on("data", (data) => {
      console.log(data.toString());
    });

    pythonProcess.stdout.on("error", function (err) {
      console.log("Error in spawned: ", err);
    });

    pythonProcess.stdout.on("close", async (code) => {
      console.log("closing code: ", code);
      const promtExists = fs.existsSync(
        path.resolve(__dirname, "../../examples/output/prompt.mp4")
      );
      if (!promtExists) {
        console.log("file not found");
        setTimeout(() => receiveMessagesFromQueue(), GET_MESSAGE_TIMEOUT_MS);
        return;
      }
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
      setTimeout(() => receiveMessagesFromQueue(), GET_MESSAGE_TIMEOUT_MS);
    });

    pythonProcess.on("exit", function (code) {
      console.log("Exited with code ", code);
    });
  } catch (e) {
    console.log(e);
    setTimeout(() => receiveMessagesFromQueue(), GET_MESSAGE_TIMEOUT_MS);
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
