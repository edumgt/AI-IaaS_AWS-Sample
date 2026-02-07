require('dotenv').config(); // .env 파일 로드
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// AWS 설정 (실제 프로젝트에서는 환경변수 사용 권장)
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
 
const rekognition = new AWS.Rekognition();

// 비교할 얼굴 이미지 파일 목록
const faceFiles = ['face1.png', 'face2.png', 
  'face3.png', 'face4.png'];

// 모든 서로 다른 쌍을 양방향으로 비교
async function compareAllFaces() {
  for (let i = 0; i < faceFiles.length; i++) {
    for (let j = 0; j < faceFiles.length; j++) {
      if (i === j) continue; // 동일한 파일은 제외

      const sourcePath = path.join(__dirname, faceFiles[i]);
      const targetPath = path.join(__dirname, faceFiles[j]);

      const sourceImage = fs.readFileSync(sourcePath);
      const targetImage = fs.readFileSync(targetPath);

      const params = {
        SourceImage: { Bytes: sourceImage },
        TargetImage: { Bytes: targetImage },
        SimilarityThreshold: 80,
      };

      try {
        const data = await rekognition.compareFaces(params).promise();

        console.log(`\n🔍 비교: ${faceFiles[i]} vs ${faceFiles[j]}`);

        if (data.FaceMatches.length > 0) {
          data.FaceMatches.forEach((match, idx) => {
            console.log(`✅ 유사 얼굴 감지됨 [${idx + 1}]: 유사도 ${match.Similarity.toFixed(2)}%`);
          });
        } else {
          console.log('❌ 유사한 얼굴 없음');
        }
      } catch (err) {
        console.error(`❌ 오류 발생: ${faceFiles[i]} vs ${faceFiles[j]}`, err.message);
      }
    }
  }
}

compareAllFaces();
