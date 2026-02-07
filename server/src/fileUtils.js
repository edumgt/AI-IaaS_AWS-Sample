// 파일 존재 여부와 파일 읽기를 위해 Node.js fs 모듈을 사용합니다.
const fs = require('fs');
// OS 경로 구분자 차이를 흡수하기 위해 path 모듈을 사용합니다.
const path = require('path');

// 기준 디렉터리와 파일명 목록을 받아 실제 존재하는 파일 정보만 반환합니다.
function resolveExistingFiles(baseDir, fileNames) {
  // 파일명 배열을 {fileName, filePath} 객체 배열로 만든 뒤 존재하는 것만 필터링합니다.
  return fileNames
    .map((fileName) => ({
      // 원본 파일명을 추적하기 위해 함께 보관합니다.
      fileName,
      // 기준 디렉터리를 기준으로 절대 경로를 계산합니다.
      filePath: path.resolve(baseDir, fileName),
    }))
    .filter(({ filePath }) => fs.existsSync(filePath));
}

// 지정한 파일 경로를 동기적으로 읽어 Buffer로 반환합니다.
function readFileBuffer(filePath) {
  // Rekognition/S3 API에서 바로 사용할 수 있도록 원본 바이너리 버퍼를 읽습니다.
  return fs.readFileSync(filePath);
}

// 유틸리티 함수를 외부 모듈에서 재사용할 수 있도록 내보냅니다.
module.exports = {
  resolveExistingFiles,
  readFileBuffer,
};
