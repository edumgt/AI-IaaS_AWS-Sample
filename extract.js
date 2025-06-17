const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// AWS 자격 증명 설정 (환경변수 or 프로파일로도 가능)
AWS.config.update({
  region: 'ap-northeast-2', // 서울 리전
  accessKeyId: '본인키',
  secretAccessKey: '본인키'
});

const rekognition = new AWS.Rekognition();

// 이미지 파일 로딩
const imageBytes = fs.readFileSync(path.resolve(__dirname, 'image.png'));

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
