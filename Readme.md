# AWS Amazon Rekognition

AWS 기초(IAM, AWS CLI, S3, Rekognition)를 실습 중심으로 학습하기 위한 예제 저장소입니다.
Node.js + AWS SDK(JavaScript v2) 기반으로 **텍스트 추출, 얼굴 비교, S3 업로드**를 빠르게 실습할 수 있습니다.

---

## 1) 프로젝트 목표
- IAM 사용자/권한/액세스 키 구조 이해
- AWS CLI 인증 및 S3 점검 기본기 습득
- AWS SDK를 통한 Rekognition API 호출 실습
- S3 버킷 업로드/정책/라이프사이클 설정 학습

## 2) 기술 스택
- Runtime: Node.js (권장 18.x)
- Language: JavaScript (CommonJS)
- Cloud: AWS (IAM, Rekognition, S3, CloudWatch, CLI)
- Library: `aws-sdk`(v2), `dotenv`
- Tooling: AWS CLI v2, npm

## 3) 주요 파일
- `extract.js`: `sample.png` 텍스트 감지
- `compare.js`: 얼굴 이미지 비교
- `upload.js`: 얼굴 이미지 S3 업로드
- `bucket.json`: S3 버킷 정책 예시
- `delete.json`: S3 라이프사이클 정책 예시

## 4) 빠른 시작

### 4-1. 의존성 설치
```bash
npm install
```

### 4-2. 환경 변수 설정 (`.env`)
```env
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=AKIA****************
AWS_SECRET_ACCESS_KEY=********************************
S3_BUCKET_NAME=your-bucket-name
S3_BUCKET_REGION=ap-northeast-2
```

> `.env`, 액세스 키, 실제 버킷명, 계정 식별자는 절대 커밋하지 마세요.

### 4-3. 스크립트 실행
```bash
npm run extract
npm run compare
npm run upload
```

## 5) AWS CLI 설정
```bash
aws configure
aws configure list
```

입력값은 반드시 마스킹/예시값만 문서화하세요.

## 6) 학습 문서
- 실행/환경 준비 상세: `Readme2.md`
- S3 퍼블릭 접근 및 라이프사이클: `Readme3.md`
- IAM Principal vs AssumeRole: `Readme4.md`

## 7) 민감정보 마스킹 기준
- 이메일: `ab***@example.com`
- Access Key: `AKIA****************`
- Account ID: `1234********`
- Bucket: `my-edu-bucket-****`
- ARN: `arn:aws:iam::1234********:user/ab***`

## 8) 참고 링크
- Rekognition: https://docs.aws.amazon.com/rekognition/
- S3: https://docs.aws.amazon.com/s3/
- AWS CLI: https://docs.aws.amazon.com/cli/

---
실습 후에는 퍼블릭 정책 해제, 불필요한 키 삭제, 키 로테이션을 반드시 수행하세요.
