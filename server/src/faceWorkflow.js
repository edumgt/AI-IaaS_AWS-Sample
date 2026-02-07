// AWS 서비스 접근용 클라이언트 팩토리 함수를 가져옵니다.
const { getS3, getRekognition } = require('./awsClients');
// 공통 실행 설정(버킷명, 파일 목록, 임계값)을 불러옵니다.
const { getConfig } = require('./config');
// 파일 존재 확인/버퍼 읽기 유틸리티를 사용합니다.
const { resolveExistingFiles, readFileBuffer } = require('./fileUtils');

// 로컬 얼굴 파일을 S3의 training/ 경로로 업로드합니다.
async function uploadFaces({ baseDir }) {
  // 환경 설정에서 버킷명과 업로드 대상 파일 목록을 가져옵니다.
  const { bucketName, faceFiles } = getConfig();
  // S3 업로드 API 호출용 클라이언트를 생성합니다.
  const s3 = getS3();

  // 실제로 존재하는 파일만 골라 업로드 대상으로 확정합니다.
  const existing = resolveExistingFiles(baseDir, faceFiles);

  // 업로드할 파일이 하나도 없으면 스킵 목록만 포함해 즉시 반환합니다.
  if (existing.length === 0) {
    return { uploaded: [], skipped: faceFiles };
  }

  // 성공적으로 업로드된 S3 Key를 저장할 배열입니다.
  const uploaded = [];
  // 설정에는 있지만 로컬 디스크에 없어서 건너뛴 파일명을 계산합니다.
  const skipped = faceFiles.filter((name) => !existing.some((entry) => entry.fileName === name));

  // 존재하는 파일을 하나씩 순회하며 순차 업로드합니다.
  for (const file of existing) {
    // 파일 바이너리를 버퍼로 읽어 업로드 본문으로 사용합니다.
    const body = readFileBuffer(file.filePath);
    // 버킷 내 정해진 폴더 구조(training/)로 객체 키를 구성합니다.
    const key = `training/${file.fileName}`;

    // S3 upload API를 호출하고 Promise 완료까지 기다립니다.
    await s3
      .upload({
        // 업로드 대상 버킷 이름입니다.
        Bucket: bucketName,
        // 버킷 내 객체 경로(키)입니다.
        Key: key,
        // 실제 업로드할 파일 데이터입니다.
        Body: body,
        // 현재 샘플 파일 형식에 맞춘 MIME 타입입니다.
        ContentType: 'image/png',
      })
      .promise();

    // 업로드 완료된 키를 결과 배열에 추가합니다.
    uploaded.push(key);
  }

  // 업로드/스킵 결과를 호출자에게 반환합니다.
  return { uploaded, skipped };
}

// 로컬 얼굴 파일들 간 모든 조합을 Rekognition으로 비교합니다.
async function compareFaces({ baseDir }) {
  // 파일 목록과 비교 임계값을 설정에서 읽어옵니다.
  const { faceFiles, similarityThreshold } = getConfig();
  // Rekognition compareFaces API 호출용 클라이언트를 생성합니다.
  const rekognition = getRekognition();
  // 실제 존재하는 파일만 비교 대상으로 추립니다.
  const existing = resolveExistingFiles(baseDir, faceFiles);
  // 비교 결과를 누적할 배열입니다.
  const comparisons = [];

  // i 인덱스를 기준으로 시작 파일을 순회합니다.
  for (let i = 0; i < existing.length; i += 1) {
    // j는 항상 i 다음부터 시작해 중복/자기 자신 비교를 방지합니다.
    for (let j = i + 1; j < existing.length; j += 1) {
      // 비교의 Source 이미지 정보를 꺼냅니다.
      const source = existing[i];
      // 비교의 Target 이미지 정보를 꺼냅니다.
      const target = existing[j];
      // Rekognition compareFaces 요청 파라미터를 구성합니다.
      const params = {
        // Source 이미지는 파일 버퍼를 그대로 전달합니다.
        SourceImage: { Bytes: readFileBuffer(source.filePath) },
        // Target 이미지도 파일 버퍼를 그대로 전달합니다.
        TargetImage: { Bytes: readFileBuffer(target.filePath) },
        // 매칭 판정에 사용할 유사도 임계값입니다.
        SimilarityThreshold: similarityThreshold,
      };

      // Rekognition에 얼굴 비교를 요청하고 응답을 기다립니다.
      const response = await rekognition.compareFaces(params).promise();
      // 가장 높은 유사도를 가진 첫 매치의 Similarity를 추출합니다.
      const maxSimilarity = response.FaceMatches?.[0]?.Similarity || 0;

      // 화면/로그 출력에 필요한 최소 정보를 정규화해 누적합니다.
      comparisons.push({
        // 비교 원본 파일명입니다.
        source: source.fileName,
        // 비교 대상 파일명입니다.
        target: target.fileName,
        // 하나 이상 매치가 있으면 true로 판정합니다.
        matched: response.FaceMatches.length > 0,
        // 유사도는 소수점 둘째 자리까지 반올림해 저장합니다.
        similarity: Number(maxSimilarity.toFixed(2)),
      });
    }
  }

  // 전체 비교 요약과 누락 파일 정보를 함께 반환합니다.
  return {
    // 실제 비교를 수행한 조합 수입니다.
    comparedCount: comparisons.length,
    // 각 조합별 비교 결과 목록입니다.
    comparisons,
    // 설정에는 있으나 디스크에 없는 파일명 목록입니다.
    missing: faceFiles.filter((name) => !existing.some((entry) => entry.fileName === name)),
  };
}

// 워크플로 함수들을 외부에서 사용할 수 있도록 내보냅니다.
module.exports = {
  uploadFaces,
  compareFaces,
};
