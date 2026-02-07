// Rekognition 클라이언트를 생성하는 공통 팩토리를 불러옵니다.
const { getRekognition } = require('../src/awsClients');

// Base64 문자열을 Buffer로 변환하며 필수 입력도 검증합니다.
function decodeBase64Image(value, fieldName) {
  // 필수 필드가 비어 있으면 어떤 값이 누락됐는지 명확히 알려줍니다.
  if (!value) {
    throw new Error(`Missing required field: ${fieldName}`);
  }

  // Rekognition API가 받을 수 있는 바이너리 버퍼로 디코딩합니다.
  return Buffer.from(value, 'base64');
}

// API Gateway/Lambda 프록시 이벤트를 처리하는 메인 핸들러입니다.
exports.handler = async (event = {}) => {
  try {
    // event.body가 문자열이면 파싱하고, 이미 객체면 그대로 사용합니다.
    const payload = typeof event.body === 'string' ? JSON.parse(event.body) : event;
    // 요청값 우선, 없으면 환경 변수, 그것도 없으면 기본값 80을 사용합니다.
    const similarityThreshold = Number(payload.similarityThreshold || process.env.SIMILARITY_THRESHOLD || 80);

    // 소스 이미지를 Base64에서 버퍼로 변환합니다.
    const sourceImage = decodeBase64Image(payload.sourceImageBase64, 'sourceImageBase64');
    // 타깃 이미지를 Base64에서 버퍼로 변환합니다.
    const targetImage = decodeBase64Image(payload.targetImageBase64, 'targetImageBase64');

    // Rekognition compareFaces 호출을 위한 클라이언트를 생성합니다.
    const rekognition = getRekognition();
    // 얼굴 비교 API를 호출하고 Promise 완료를 대기합니다.
    const result = await rekognition
      .compareFaces({
        // 비교 기준이 되는 소스 이미지 데이터입니다.
        SourceImage: { Bytes: sourceImage },
        // 소스와 비교될 대상 이미지 데이터입니다.
        TargetImage: { Bytes: targetImage },
        // Rekognition 내부 매칭 판정 임계값입니다.
        SimilarityThreshold: similarityThreshold,
      })
      .promise();

    // FaceMatches 배열을 프런트에서 쓰기 좋은 형태로 정규화합니다.
    const matches = (result.FaceMatches || []).map((entry) => ({
      // 유사도는 소수점 둘째 자리까지 고정합니다.
      similarity: Number(entry.Similarity.toFixed(2)),
      // 얼굴 검출 신뢰도도 동일하게 소수점 둘째 자리까지 변환합니다.
      confidence: Number(entry.Face.Confidence.toFixed(2)),
      // 박스 좌표는 Rekognition 원본 형식을 그대로 전달합니다.
      boundingBox: entry.Face.BoundingBox,
    }));

    // 성공 응답을 Lambda 프록시 형식(statusCode + body)으로 반환합니다.
    return {
      statusCode: 200,
      body: JSON.stringify({
        // 하나라도 매치가 있으면 true입니다.
        matched: matches.length > 0,
        // 실제로 사용한 임계값을 그대로 노출합니다.
        requestedSimilarityThreshold: similarityThreshold,
        // 가장 높은 유사도를 별도 필드로 제공합니다.
        maxSimilarity: matches[0]?.similarity || 0,
        // 전체 매치 목록입니다.
        matches,
      }),
    };
  } catch (error) {
    // 검증/파싱/호출 중 발생한 모든 오류를 400으로 반환합니다.
    return {
      statusCode: 400,
      body: JSON.stringify({
        // 디버깅을 위해 에러 메시지를 전달합니다.
        message: error.message,
      }),
    };
  }
};
