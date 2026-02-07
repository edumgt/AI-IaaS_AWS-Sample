const fs = require('fs');
const path = require('path');
const { getRekognition } = require('./src/awsClients');

async function main() {
  const rekognition = getRekognition();
  const imageBytes = fs.readFileSync(path.resolve(__dirname, 'sample.png'));

  const data = await rekognition
    .detectText({
      Image: { Bytes: imageBytes },
    })
    .promise();

  console.log('🔍 이미지에서 감지된 텍스트 목록:\n');
  data.TextDetections.forEach((text, idx) => {
    console.log(`[${idx + 1}] ${text.DetectedText} (신뢰도: ${text.Confidence.toFixed(2)}%)`);
  });
}

main().catch((error) => {
  console.error('❌ 에러 발생:', error.message);
  process.exit(1);
});
