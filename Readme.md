# AWS Cloud Basic 학습 저장소

AWS 기초 학습(IAM, AWS CLI, S3, Rekognition)을 실습 중심으로 따라갈 수 있도록 구성한 교육용 레포지토리입니다.  
Node.js + AWS SDK(JavaScript v2) 기반 예제를 통해 **텍스트 추출, 얼굴 비교, S3 업로드**를 빠르게 실습할 수 있습니다.

---

## 1) 프로젝트 목표
- AWS 계정/권한의 기본 구조(IAM 사용자, 정책, 액세스 키) 이해
- AWS CLI로 인증 및 S3 리소스 상태 점검
- AWS SDK를 사용한 Rekognition API 호출
- S3 버킷 업로드/정책/라이프사이클 설정 기초 학습

---

## 2) 기술 스택
- **Runtime**: Node.js (권장: 18.x)
- **Language**: JavaScript (CommonJS)
- **Cloud**: AWS (IAM, Rekognition, S3, CloudWatch, CLI)
- **SDK/Library**:
  - `aws-sdk` (v2)
  - `dotenv`
- **Tools**:
  - AWS CLI v2
  - npm

---

## 3) 레포지토리 구성
- `extract.js`: 이미지(`sample.png`)에서 텍스트 감지 (Rekognition DetectText)
- `compare.js`: 얼굴 이미지(`face1~4.png`) 상호 비교 (Rekognition CompareFaces)
- `upload.js`: 얼굴 이미지 파일을 S3 버킷으로 업로드
- `bucket.json`: S3 버킷 정책 예시
- `delete.json`: S3 Lifecycle 정책 예시(자동 만료)
- `face*.png`, `sample.png`: 실습용 이미지
- `Cloud_AWS_*.mp4`: 수업 보조 영상 자료

---

## 4) 사전 준비
1. AWS 계정
2. IAM 사용자 생성
3. 최소 권한 정책(실습용)
   - Rekognition 실습: `AmazonRekognitionFullAccess`
   - S3 실습: `AmazonS3FullAccess`
4. Access Key 발급 (CLI/SDK 용)

> 운영 환경에서는 최소 권한 원칙(Least Privilege)으로 커스텀 정책을 권장합니다.

---

## 5) 로컬 실행 방법

### 5-1. 의존성 설치
```bash
npm install
```

### 5-2. 환경 변수 파일 생성
프로젝트 루트에 `.env` 파일 생성:

```env
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=AKIA****************
AWS_SECRET_ACCESS_KEY=********************************
S3_BUCKET_NAME=your-bucket-name
```

> 민감정보(Access Key, Secret Key, 실제 버킷명/계정 ID)는 절대 Git에 커밋하지 마세요.

### 5-3. 스크립트 실행
```bash
npm run extract   # sample.png 텍스트 추출
npm run compare   # face1~4 상호 얼굴 비교
npm run upload    # face1~4 S3 업로드
```

---

## 6) AWS CLI 기본 설정
```bash
aws configure
```

입력 예시(마스킹):
- AWS Access Key ID: `AKIA****************`
- AWS Secret Access Key: `********************************`
- Default region name: `ap-northeast-2`
- Default output format: `json`

설정 확인:
```bash
aws configure list
```

---

## 7) 학습 로드맵 (권장 순서)
1. **IAM**: 사용자/정책/액세스 키 개념 이해
2. **AWS CLI**: `aws configure`, S3 조회 명령 실습
3. **Rekognition**:
   - `extract.js`로 OCR(텍스트 감지)
   - `compare.js`로 얼굴 유사도 비교
4. **S3**:
   - `upload.js`로 이미지 업로드
   - `bucket.json`으로 공개/비공개 정책 이해
   - `delete.json`으로 라이프사이클(자동 만료) 이해

---

## 8) 보안 및 민감정보 처리 기준
이 레포지토리는 학습용이므로 아래 기준을 유지합니다.

- 이메일, 키, 계정번호, 버킷명 등 식별 가능한 정보는 **마스킹** 처리
- 문서 내 자격 증명은 모두 예시값으로 표기
- `.env` / 액세스 키 / 실제 계정 정보는 절대 커밋 금지
- 퍼블릭 S3 정책 실습 시 학습 후 즉시 정책 회수 권장

마스킹 예시:
- 이메일: `ab***@example.com`
- Access Key: `AKIA****************`
- Account ID: `1234********`
- Bucket: `my-edu-bucket-****`

---

## 9) 자주 겪는 이슈
- `InvalidAccessKeyId` / `SignatureDoesNotMatch`
  - `.env` 값 오타, 리전 불일치, 만료/비활성 키 확인
- `AccessDenied`
  - IAM 정책 누락 또는 버킷 정책/퍼블릭 액세스 차단 확인
- `NoSuchBucket`
  - 버킷명 오타 또는 리전 불일치
- Lifecycle 규칙 오류
  - `Day`가 아니라 `Days` 필드 사용 필요

---

## 10) 학습용 체크리스트
- [ ] IAM 사용자 및 권한 설정 완료
- [ ] `.env` 파일 생성 및 로컬 보관
- [ ] `npm run extract` 성공
- [ ] `npm run compare` 성공
- [ ] `npm run upload` 성공
- [ ] 버킷 정책/라이프사이클 적용 및 확인
- [ ] 실습 종료 후 퍼블릭 정책/불필요 키 정리

---

## 11) 참고
- AWS Rekognition: https://docs.aws.amazon.com/rekognition/
- AWS S3: https://docs.aws.amazon.com/s3/
- AWS CLI: https://docs.aws.amazon.com/cli/

> 본 저장소는 "AWS 기본 학습" 목적의 예제 모음입니다. 실제 서비스 반영 전에는 IAM 최소권한, 키 로테이션, 비밀관리(Secrets Manager/SSM) 등을 반드시 적용하세요.
