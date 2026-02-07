const path = require('path');
const { uploadFaces } = require('../src/faceWorkflow');

exports.handler = async () => {
  const baseDir = process.env.LOCAL_FACE_DIR || path.resolve(__dirname, '..');
  const result = await uploadFaces({ baseDir });

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Face image upload completed',
      ...result,
    }),
  };
};
