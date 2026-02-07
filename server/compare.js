const { compareFaces } = require('./src/faceWorkflow');

async function main() {
  const result = await compareFaces({ baseDir: __dirname });

  console.log(`총 비교 건수: ${result.comparedCount}`);

  result.comparisons.forEach((item) => {
    const status = item.matched ? '✅ 매칭' : '❌ 비매칭';
    console.log(`${status} | ${item.source} vs ${item.target} | 유사도 ${item.similarity}%`);
  });

  result.missing.forEach((name) => {
    console.log(`⚠️ 파일 없음(비교 제외): ${name}`);
  });
}

main().catch((error) => {
  console.error('❌ 얼굴 비교 실패:', error.message);
  process.exit(1);
});
