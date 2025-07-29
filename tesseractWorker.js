const { createWorker } = require('tesseract.js');
const worker = createWorker();

let initialized = false;
async function getWorker() {
  if (!initialized) {
    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    initialized = true;
  }
  return worker;
}

async function terminateWorker() {
  if (initialized) {
    await worker.terminate();
    initialized = false;
  }
}

module.exports = { getWorker, terminateWorker }; 