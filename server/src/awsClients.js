const AWS = require('aws-sdk');
const { getConfig } = require('./config');

let initialized = false;

function initializeAws() {
  if (initialized) {
    return;
  }

  const { region } = getConfig();
  const awsConfig = { region };

  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    awsConfig.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    awsConfig.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  }

  AWS.config.update(awsConfig);
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
