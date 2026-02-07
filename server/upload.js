const path = require('path');
const { uploadFaces } = require('./src/faceWorkflow');

async function main() {
  const result = await uploadFaces({ baseDir: __dirname });

  result.uploaded.forEach((key) => {
    console.log(`✅ 업로드 성공: ${key}`);
  });

  result.skipped.forEach((name) => {
    console.log(`⚠️ 파일 없음(건너뜀): ${name}`);
  });
}

main().catch((error) => {
  console.error('❌ 업로드 작업 실패:', error.message);
  process.exit(1);
});
