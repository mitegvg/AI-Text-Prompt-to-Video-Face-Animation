require("dotenv").config();
const { receiveMessagesFromQueue } = require("./queue/read");
receiveMessagesFromQueue();
