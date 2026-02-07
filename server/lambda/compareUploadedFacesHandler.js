const { getRekognition } = require('../src/awsClients');

function decodeBase64Image(value, fieldName) {
  if (!value) {
    throw new Error(`Missing required field: ${fieldName}`);
  }

  return Buffer.from(value, 'base64');
}

exports.handler = async (event = {}) => {
  try {
    const payload = typeof event.body === 'string' ? JSON.parse(event.body) : event;
    const similarityThreshold = Number(payload.similarityThreshold || process.env.SIMILARITY_THRESHOLD || 80);

    const sourceImage = decodeBase64Image(payload.sourceImageBase64, 'sourceImageBase64');
    const targetImage = decodeBase64Image(payload.targetImageBase64, 'targetImageBase64');

    const rekognition = getRekognition();
    const result = await rekognition
      .compareFaces({
        SourceImage: { Bytes: sourceImage },
        TargetImage: { Bytes: targetImage },
        SimilarityThreshold: similarityThreshold,
      })
      .promise();

    const matches = (result.FaceMatches || []).map((entry) => ({
      similarity: Number(entry.Similarity.toFixed(2)),
      confidence: Number(entry.Face.Confidence.toFixed(2)),
      boundingBox: entry.Face.BoundingBox,
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        matched: matches.length > 0,
        requestedSimilarityThreshold: similarityThreshold,
        maxSimilarity: matches[0]?.similarity || 0,
        matches,
      }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: error.message,
      }),
    };
  }
};
