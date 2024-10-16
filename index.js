const express = require("express");
const app = express();
const path = require("path");
const spawn = require("child_process").spawn;

require("dotenv").config();
const createSound = require("./node/polly");
const getOpenAIChat = require("./node/chatgpt");
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "/node/templates/index.html"));
});
app.get("/generate/:prompt/:style", async function (req, res) {
  console.log(`Generating sound for ${req.params.prompt}`);
  const openaiRes = await getOpenAIChat(
    `say ${req.params.prompt} in the style of ${req.params.style}`
  );
  console.log("openaiRes", openaiRes);
  await createSound(openaiRes, req.params.style);
  const pythonProcess = spawn("/opt/miniconda3/envs/face_anim/bin/python", [
    "./main_end2end.py",
  ]);
  pythonProcess.stdout.on("data", (data) => {
    console.log(data.toString());
  });
  res.send({ res: openaiRes });
});

app.use("/public", express.static(__dirname + "/public"));
app.use("/examples", express.static(__dirname + "/examples"));

const port = process.env.PORT || 80;
const server = app.listen(port);
console.log("Express app started on port " + port);
