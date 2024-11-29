const https = require("https");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const MAX_RETRIES = 5;

async function getSoundFromExternalSource(url) {
  const fileName = "prompt";
  return new Promise(async (resolve, reject) => {
    const filePath = path.resolve(__dirname, `../../examples/output.mp3`);
    const wavFilePath = path.resolve(
      __dirname,
      `../../examples/${fileName}.wav`
    );

    const file = fs.createWriteStream(filePath);

    let retries = 0;
    const downloadFile = async () => {
      return new Promise((res, rej) => {
        https.get(url, (response) => {
          console.log("downloading", url);
          if (response.statusCode !== 200) {
            rej(new Error("Download failed"));
            return;
          }

          response.pipe(file);
          file.on("finish", async () => {
            console.log("finished downloading");
            file.close();
            try {
              await convertMp3ToWav(filePath, wavFilePath);
              console.log("successfully converted to wav");
              resolve(wavFilePath);
            } catch (error) {
              console.log("error converting mp3 to wav", error);
              reject(error);
            }
          });
        });
      });
    };

    const downloadWithRetry = async () => {
      try {
        await downloadFile();
      } catch (error) {
        if (retries < MAX_RETRIES) {
          retries++;
          console.log(
            `Download failed, retrying in 1 second... (Attempt ${retries})`
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await downloadWithRetry();
        } else {
          reject(error);
        }
      }
    };
    await downloadWithRetry();
  });
}

function convertMp3ToWav(mp3Path, wavPath) {
  return new Promise((resolve, reject) => {
    const promtExists = fs.existsSync(wavPath);
    if (promtExists) {
      console.log("removed existing file");
      fs.unlinkSync(wavPath);
    }
    const command = `ffmpeg -i "${mp3Path}" -acodec pcm_s16le -ac 1 -ar 44100 "${wavPath}"`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(error);
        reject(error);
        return;
      }
      if (stderr) {
        console.log(stderr);
        resolve(stderr);
        return;
      }
      resolve(stdout);
    });
  });
}

module.exports = { getSoundFromExternalSource };
