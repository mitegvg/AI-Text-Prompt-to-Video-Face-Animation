const {
  getSoundFromExternalSource,
} = require("../../queue/getSoundFromExternalSource");
const fs = require("fs");
const path = require("path");
const https = require("https");
const { exec } = require("child_process");

jest.mock("child_process", () => ({
  exec: jest.fn(),
}));

jest.mock("https", () => ({
  get: jest.fn(),
}));

jest.mock("fs", () => ({
  createWriteStream: jest.fn(),
}));

describe("getSoundFromExternalSource", () => {
  it("should download and convert a sound file successfully", async () => {
    const mockUrl = "https://example.com/sound.mp3";
    const mockFilePath = path.resolve(
      __dirname,
      `../../../examples/output.mp3`
    );
    const mockWavFilePath = path.resolve(
      __dirname,
      `../../../examples/prompt.wav`
    );

    const mockResponse = {
      pipe: jest.fn(),
      on: jest.fn(),
    };

    const mockFile = {
      close: jest.fn(),
      on: jest.fn((event, callback) => {
        if (event === "finish") {
          callback();
        }
      }),
    };

    https.get.mockImplementation((url, callback) => {
      callback(mockResponse);
      return {
        on: jest.fn(),
      };
    });

    fs.createWriteStream.mockReturnValue(mockFile);

    exec.mockImplementation((command, callback) => {
      callback(null, "", "");
    });

    const wavFilePath = await getSoundFromExternalSource(mockUrl);
    expect(wavFilePath).toBe(mockWavFilePath);
    expect(https.get).toHaveBeenCalledWith(mockUrl, expect.any(Function));
    expect(fs.createWriteStream).toHaveBeenCalledWith(mockFilePath);
    expect(mockFile.close).toHaveBeenCalled();
    expect(exec).toHaveBeenCalledWith(
      expect.stringContaining(mockFilePath),
      expect.any(Function)
    );
  });
});
