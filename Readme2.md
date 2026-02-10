# 실행 가이드 (로컬 환경)

이 문서는 로컬 PC에서 AWS Rekognition 예제를 빠르게 실행해 보는 실습형 가이드입니다.
"명령은 실행되는데 결과가 안 나온다"는 상황을 줄이기 위해, **실행 전 점검 → 실행 → 문제 해결** 순서로 정리했습니다.

---

## 1) Node 버전 확인/선택

이 레포는 Node.js 18 계열을 기준으로 작성되어 있습니다.

```bash
nvm ls
nvm use 18.12.0
node -v
npm -v
```

- `nvm use` 이후 `node -v`가 기대 버전인지 확인하세요.
- 팀 환경이라면 `.nvmrc`를 두고 버전을 고정하는 방식을 권장합니다.

---

## 2) 의존성 설치

프로젝트 루트(또는 `server` 폴더 기준)에서 패키지를 먼저 설치합니다.

```bash
npm install
```

설치 후 `package-lock.json`이 변경되면 팀원과 동일한 버전으로 맞추는 데 도움이 됩니다.

---

## 3) 기본 실행 명령

```bash
npm run compare
npm run extract
npm run upload
```

각 명령의 의미:
- `npm run compare`: 두 얼굴 이미지의 유사도를 계산해 콘솔에 출력
- `npm run extract`: 이미지 내 텍스트를 감지(DetectText)
- `npm run upload`: 실습 이미지를 S3 버킷으로 업로드

### 권장 실행 순서
1. `upload`로 샘플 이미지를 먼저 S3에 업로드
2. `compare`로 유사도 비교 결과 확인
3. `extract`로 OCR 결과 확인

---

## 4) S3 연동을 위한 `.env` 설정

최소 설정 예시는 아래와 같습니다.

```env
AWS_REGION=ap-northeast-2
S3_BUCKET_NAME=your-bucket-name
S3_BUCKET_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

설정 체크 포인트:
- `AWS_REGION`과 `S3_BUCKET_REGION`이 다르면 업로드/조회가 실패할 수 있습니다.
- `S3_BUCKET_NAME`은 전역에서 유일해야 하며, 이미 사용 중이면 다른 이름을 사용해야 합니다.
- 운영에서는 정적 키 대신 IAM Role/SSO 사용을 권장합니다.

---

## 5) IAM 권한(학습용)

학습 단계에서는 아래 관리형 정책으로 빠르게 검증할 수 있습니다.
- `AmazonRekognitionFullAccess`
- `AmazonS3FullAccess`

> 운영 환경에서는 반드시 최소 권한 원칙을 적용하세요.
> 예: 특정 버킷 ARN만 허용, 필요한 Rekognition API만 허용, `Condition`으로 리전/리소스 제한.

---

## 6) 자주 발생하는 오류와 점검 방법

### 6-1. `AccessDeniedException`
- 원인: IAM 권한 부족 또는 다른 계정 자격증명 사용
- 점검:
  ```bash
  aws sts get-caller-identity
  ```

### 6-2. `NoSuchBucket`
- 원인: 버킷명이 틀렸거나 리전이 다름
- 점검:
  ```bash
  aws s3api head-bucket --bucket your-bucket-name
  ```

### 6-3. `InvalidSignatureException` 또는 시간 관련 오류
- 원인: 로컬 시스템 시간 불일치
- 점검: OS 시간 자동 동기화(NTP) 활성화

---

## 7) 실습 이미지 자료

아래 이미지는 실습 절차 참고용입니다.
- `image-3.png` ~ `image-11.png`

추가 팁:
- 얼굴 비교는 해상도가 너무 낮으면 정확도가 떨어집니다.
- 텍스트 추출은 대비가 높은 이미지에서 더 안정적입니다.
