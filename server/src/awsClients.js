const AWS = require('aws-sdk');
const { getConfig } = require('./config');

let initialized = false;

function initializeAws() {
  if (initialized) return;

  const { region } = getConfig();
  // Lambda에서는 Execution Role 기반 자격증명을 사용해야 합니다.
  // accessKeyId/secretAccessKey를 수동 주입하지 않습니다.
  AWS.config.update({ region });
  initialized = true;
}

function getS3() {
  initializeAws();
  return new AWS.S3();
}

function getRekognition() {
  initializeAws();
  return new AWS.Rekognition();
}

module.exports = {
  getS3,
  getRekognition,
};
