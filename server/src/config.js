require('dotenv').config();

const REQUIRED_ENV = ['AWS_REGION', 'S3_BUCKET_NAME'];

function getConfig() {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }

  return {
    region: process.env.AWS_REGION,
    bucketName: process.env.S3_BUCKET_NAME,
    similarityThreshold: Number(process.env.SIMILARITY_THRESHOLD || 80),
    faceFiles: (process.env.FACE_FILES || 'face1.png,face2.png,face3.png,face4.png')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean),
  };
}

module.exports = {
  getConfig,
};
