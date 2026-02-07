// Rekognition 클라이언트 생성 함수를 가져옵니다.
const { getRekognition } = require('../src/awsClients');

// Base64 이미지 입력을 검증하고 Buffer로 변환합니다.
function decodeBase64Image(value) {
  // 요청에서 이미지가 누락되면 즉시 오류를 발생시킵니다.
  if (!value) {
    throw new Error('Missing required field: imageBase64');
  }

  // Rekognition detectText가 처리 가능한 바이너리 버퍼로 변환합니다.
  return Buffer.from(value, 'base64');
}

// 텍스트 추출 Lambda 핸들러입니다.
exports.handler = async (event = {}) => {
  try {
    // API Gateway 프록시(body 문자열)와 직접 호출(객체) 모두 처리합니다.
    const payload = typeof event.body === 'string' ? JSON.parse(event.body) : event;
    // 이미지 Base64를 바이너리로 디코딩합니다.
    const imageBytes = decodeBase64Image(payload.imageBase64);

    // Rekognition 클라이언트를 생성합니다.
    const rekognition = getRekognition();
    // detectText API를 호출해 텍스트 검출 결과를 받아옵니다.
    const data = await rekognition
      .detectText({
        // 분석할 이미지 본문입니다.
        Image: { Bytes: imageBytes },
      })
      .promise();

    // 원본 응답을 프런트 표시에 적합한 형태로 정규화합니다.
    const textDetections = (data.TextDetections || []).map((entry) => ({
      // 검출된 문자열 자체입니다.
      detectedText: entry.DetectedText,
      // LINE/WORD 등 Rekognition 분류 타입입니다.
      type: entry.Type,
      // 신뢰도를 소수점 둘째 자리까지 변환합니다.
      confidence: Number(entry.Confidence.toFixed(2)),
    }));

    // 성공 응답을 Lambda 프록시 형식으로 반환합니다.
    return {
      statusCode: 200,
      body: JSON.stringify({
        // 검출된 항목 개수입니다.
        count: textDetections.length,
        // 정규화된 검출 결과 목록입니다.
        textDetections,
      }),
    };
  } catch (error) {
    // 파싱/검증/API 호출 오류를 클라이언트에 전달합니다.
    return {
      statusCode: 400,
      body: JSON.stringify({
        // 디버깅 가능한 메시지를 그대로 내려줍니다.
        message: error.message,
      }),
    };
  }
};
