// 경로 계산을 위해 Node.js path 모듈을 사용합니다.
const path = require('path');
// 얼굴 업로드 워크플로 함수를 불러옵니다.
const { uploadFaces } = require('../src/faceWorkflow');

// 업로드 Lambda 엔트리 포인트입니다.
exports.handler = async () => {
  // 로컬 기준 디렉터리는 환경 변수 우선, 없으면 server 디렉터리로 설정합니다.
  const baseDir = process.env.LOCAL_FACE_DIR || path.resolve(__dirname, '..');
  // 얼굴 파일 업로드를 실행하고 결과를 기다립니다.
  const result = await uploadFaces({ baseDir });

  // 성공 응답을 JSON 문자열로 감싸 Lambda 프록시 형식으로 반환합니다.
  return {
    statusCode: 200,
    body: JSON.stringify({
      // 작업 완료 메시지입니다.
      message: 'Face image upload completed',
      // uploaded/skipped 상세 결과를 펼쳐서 함께 반환합니다.
      ...result,
    }),
  };
};
