// 경로 연산을 위해 path 모듈을 사용합니다.
const path = require('path');
// 얼굴 비교 워크플로 함수를 불러옵니다.
const { compareFaces } = require('../src/faceWorkflow');

// 비교 Lambda 엔트리 포인트입니다.
exports.handler = async () => {
  // 기준 디렉터리는 환경 변수 우선, 기본값은 server 루트입니다.
  const baseDir = process.env.LOCAL_FACE_DIR || path.resolve(__dirname, '..');
  // 모든 얼굴 조합 비교 작업을 실행합니다.
  const result = await compareFaces({ baseDir });

  // 성공 응답을 Lambda 프록시 형식으로 반환합니다.
  return {
    statusCode: 200,
    body: JSON.stringify({
      // 작업 완료 안내 메시지입니다.
      message: 'Face similarity analysis completed',
      // comparedCount/comparisons/missing 결과를 함께 포함합니다.
      ...result,
    }),
  };
};
