const { getS3, getRekognition } = require('./awsClients');
const { getConfig } = require('./config');
const { resolveExistingFiles, readFileBuffer } = require('./fileUtils');

async function uploadFaces({ baseDir }) {
  const { bucketName, faceFiles } = getConfig();
  const s3 = getS3();

  const existing = resolveExistingFiles(baseDir, faceFiles);

  if (existing.length === 0) {
    return { uploaded: [], skipped: faceFiles };
  }

  const uploaded = [];
  const skipped = faceFiles.filter((name) => !existing.some((entry) => entry.fileName === name));

  for (const file of existing) {
    const body = readFileBuffer(file.filePath);
    const key = `training/${file.fileName}`;

    await s3
      .upload({
        Bucket: bucketName,
        Key: key,
        Body: body,
        ContentType: 'image/png',
      })
      .promise();

    uploaded.push(key);
  }

  return { uploaded, skipped };
}

async function compareFaces({ baseDir }) {
  const { faceFiles, similarityThreshold } = getConfig();
  const rekognition = getRekognition();
  const existing = resolveExistingFiles(baseDir, faceFiles);
  const comparisons = [];

  for (let i = 0; i < existing.length; i += 1) {
    for (let j = i + 1; j < existing.length; j += 1) {
      const source = existing[i];
      const target = existing[j];
      const params = {
        SourceImage: { Bytes: readFileBuffer(source.filePath) },
        TargetImage: { Bytes: readFileBuffer(target.filePath) },
        SimilarityThreshold: similarityThreshold,
      };

      const response = await rekognition.compareFaces(params).promise();
      const maxSimilarity = response.FaceMatches?.[0]?.Similarity || 0;

      comparisons.push({
        source: source.fileName,
        target: target.fileName,
        matched: response.FaceMatches.length > 0,
        similarity: Number(maxSimilarity.toFixed(2)),
      });
    }
  }

  return {
    comparedCount: comparisons.length,
    comparisons,
    missing: faceFiles.filter((name) => !existing.some((entry) => entry.fileName === name)),
  };
}

module.exports = {
  uploadFaces,
  compareFaces,
};
