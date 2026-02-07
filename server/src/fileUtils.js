const fs = require('fs');
const path = require('path');

function resolveExistingFiles(baseDir, fileNames) {
  return fileNames
    .map((fileName) => ({
      fileName,
      filePath: path.resolve(baseDir, fileName),
    }))
    .filter(({ filePath }) => fs.existsSync(filePath));
}

function readFileBuffer(filePath) {
  return fs.readFileSync(filePath);
}

module.exports = {
  resolveExistingFiles,
  readFileBuffer,
};
