const { receiveMessagesFromQueue } = require("../../queue/read");
const {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} = require("@aws-sdk/client-sqs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");
const {
  getSoundFromExternalSource,
} = require("../../queue/getSoundFromExternalSource");
const spawn = require("child_process").spawn;
jest.useFakeTimers();
jest.mock("@aws-sdk/client-sqs", () => ({
  SQSClient: jest.fn(),
  ReceiveMessageCommand: jest.fn(),
  DeleteMessageCommand: jest.fn(),
}));

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(),
  PutObjectCommand: jest.fn(),
}));

jest.mock("fs", () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  unlink: jest.fn(),
}));

jest.mock("../../queue/getSoundFromExternalSource", () => ({
  __esModule: true,
  getSoundFromExternalSource: jest.fn(),
}));

jest.mock("child_process", () => ({
  spawn: jest.fn(),
}));

describe("receiveMessagesFromQueue", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should process a message successfully", async () => {
    const mockMessage = {
      MessageId: "123",
      Body: JSON.stringify({
        text: "test",
        name: "test",
        scene: "test",
        id: "test",
      }),
      ReceiptHandle: "456",
    };
    const mockResponse = { Messages: [mockMessage] };
    const mockS3Response = {};
    const stdoutErrOn = jest.fn();

    const mockedOnFunc = (type, cb) => {
      if (type === "close") {
        cb();
      }
    };
    const mockPythonProcess = {
      stdout: { on: mockedOnFunc },
      stderr: { on: mockedOnFunc },
      on: mockedOnFunc,
    };

    SQSClient.mockImplementation(() => ({
      send: () => {
        console.log("resolving..");
        return Promise.resolve(mockResponse);
      },
    }));
    S3Client.mockImplementation(() => ({
      send: () => Promise.resolve(mockS3Response),
    }));
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("mockFileContent");
    spawn.mockReturnValue(mockPythonProcess);

    await receiveMessagesFromQueue();

    jest.advanceTimersByTime(1000);
    expect(SQSClient).toHaveBeenCalled();
    //expect(SQSClient().send).toHaveBeenCalled();
    expect(S3Client).toHaveBeenCalled();
    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.readFileSync).toHaveBeenCalled();
    expect(spawn).toHaveBeenCalled();
    expect(getSoundFromExternalSource).toHaveBeenCalled();
    //expect(stdoutErrOn).toHaveBeenCalled();
    //expect(mockPythonProcess.on).toHaveBeenCalled();
  });

  it("should handle errors gracefully", async () => {
    const mockError = new Error("mockError");
    SQSClient.mockImplementation(() => ({
      send: jest.fn().mockRejectedValue(mockError),
    }));

    await receiveMessagesFromQueue();

    expect(SQSClient).toHaveBeenCalled();

    // Add assertions to check for error handling, logging, or other appropriate actions
  });

  it("should handle empty queue", async () => {
    SQSClient.mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({ Messages: [] }),
    }));
    await receiveMessagesFromQueue();
    expect(SQSClient).toHaveBeenCalled();
  });
});
