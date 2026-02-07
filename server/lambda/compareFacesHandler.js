const path = require('path');
const { compareFaces } = require('../src/faceWorkflow');

exports.handler = async () => {
  const baseDir = process.env.LOCAL_FACE_DIR || path.resolve(__dirname, '..');
  const result = await compareFaces({ baseDir });

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Face similarity analysis completed',
      ...result,
    }),
  };
};
