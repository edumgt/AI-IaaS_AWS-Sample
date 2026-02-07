require('dotenv').config(); // .env 파일 로드
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// AWS 자격 증명 및 리전 설정
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const rekognition = new AWS.Rekognition();
 
// 이미지 파일 로딩
const imageBytes = fs.readFileSync(path.resolve(__dirname, 'sample.png'));

// Rekognition API 호출
const params = {
  Image: {
    Bytes: imageBytes,
  },
};

rekognition.detectText(params, (err, data) => {
  if (err) {
    console.error('❌ 에러 발생:', err);
  } else {
    console.log('🔍 이미지에서 감지된 텍스트 목록:\n');
    data.TextDetections.forEach((text, idx) => {
      console.log(`[${idx + 1}] ${text.DetectedText} (신뢰도: ${text.Confidence.toFixed(2)}%)`);
    });
  }
});
