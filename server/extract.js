// 파일 읽기에 사용할 fs 모듈입니다.
const fs = require('fs');
// 샘플 이미지 절대 경로 계산에 사용할 path 모듈입니다.
const path = require('path');
// Rekognition 클라이언트 생성 함수를 가져옵니다.
const { getRekognition } = require('./src/awsClients');

// 텍스트 추출 CLI 진입점입니다.
async function main() {
  // Rekognition detectText 호출용 클라이언트를 생성합니다.
  const rekognition = getRekognition();
  // server 디렉터리의 sample.png를 동기적으로 읽어 이미지 버퍼를 만듭니다.
  const imageBytes = fs.readFileSync(path.resolve(__dirname, 'sample.png'));

  // 텍스트 검출 API를 호출하고 결과를 기다립니다.
  const data = await rekognition
    .detectText({
      // 분석 대상 이미지 버퍼를 전달합니다.
      Image: { Bytes: imageBytes },
    })
    .promise();

  // 결과 출력 시작 안내 문구입니다.
  console.log('🔍 이미지에서 감지된 텍스트 목록:\n');
  // 검출된 텍스트를 인덱스와 함께 순차 출력합니다.
  data.TextDetections.forEach((text, idx) => {
    console.log(`[${idx + 1}] ${text.DetectedText} (신뢰도: ${text.Confidence.toFixed(2)}%)`);
  });
}

// 실행 중 오류가 발생하면 메시지를 출력하고 종료 코드를 1로 설정합니다.
main().catch((error) => {
  console.error('❌ 에러 발생:', error.message);
  process.exit(1);
});
