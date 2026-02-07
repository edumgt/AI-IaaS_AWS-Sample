# AWS Amazon Rekognition

## 시작 전에 먼저 학습해야 할 기술 스택 (Pre-Study Roadmap)
이 저장소는 **AWS + Node.js + CLI 자동화**를 한 번에 다루기 때문에, 아래 순서로 선행 학습을 하면 실습 성공률이 크게 올라갑니다.

### 1) 클라우드/AWS 공통 기초
- Region / AZ / Account 개념
- 루트 계정 보안(MFA), IAM 사용자 분리 원칙
- 비용 구조(요청 기반 과금, 저장소 과금)

### 2) IAM (권한 모델 핵심)
- IAM User / Group / Role 차이
- JSON Policy 문법(Effect, Action, Resource, Condition)
- 최소 권한 원칙(Least Privilege)

### 3) AWS CLI
- `aws configure`, `aws sts get-caller-identity`
- `aws s3 ls/cp/sync/rm`, `aws s3api` 기초
- 프로파일 기반 운영(`AWS_PROFILE`)과 자동화 시 주의사항

### 4) Amazon S3
- 버킷/객체 구조, 퍼블릭 접근 차단
- 버킷 정책, 라이프사이클, 기본 암호화(SSE-S3)
- 실습 버킷: **`polly-bucket-edumgt`**

### 5) Node.js + AWS SDK (JavaScript v2)
- 비동기 처리(Promise), CommonJS 모듈
- `dotenv`로 자격증명/리전 변수 분리
- Rekognition API 응답(JSON) 해석

### 6) Amazon Rekognition
- DetectText / CompareFaces 사용 목적
- confidence threshold와 오탐/미탐 이해
- 이미지 입력(S3 Object vs Bytes) 전략

### 7) 운영/자동화 관점
- Bash 스크립트 작성(`set -euo pipefail`)
- 반복 작업을 CLI로 배치 처리
- 리포트 생성/정리(cleanup) 루틴 자동화

---

AWS 기초(IAM, AWS CLI, S3, Rekognition)를 실습 중심으로 학습하기 위한 예제 저장소입니다.
Node.js + AWS SDK(JavaScript v2) 기반으로 **텍스트 추출, 얼굴 비교, S3 업로드**를 빠르게 실습할 수 있습니다.

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
- `scripts/aws_batch_ops.sh`: AWS CLI 일괄 작업 스크립트

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
S3_BUCKET_NAME=polly-bucket-edumgt
S3_BUCKET_REGION=ap-northeast-2
```

> `.env`, 액세스 키, 실제 계정 식별자는 절대 커밋하지 마세요.

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

## 6) AWS CLI 일괄 작업 스크립트
`polly-bucket-edumgt` 기준으로 버킷 초기화/업로드/동기화/리포트를 자동화합니다.

```bash
# 초기화(버킷 생성, 암호화, lifecycle)
./scripts/aws_batch_ops.sh init

# 기본 샘플 업로드(sample.png, face1~4.png)
./scripts/aws_batch_ops.sh upload

# 이미지 일괄 동기화
UPLOAD_DIR=. ./scripts/aws_batch_ops.sh sync

# 객체 목록 조회
./scripts/aws_batch_ops.sh list

# 리포트 생성
./scripts/aws_batch_ops.sh report

# training/ 정리
./scripts/aws_batch_ops.sh cleanup
```

## 7) 학습 문서
- 챕터형 커리큘럼: `DOC/Chapter01` ~ `DOC/Chapter10`
- 실행/환경 준비 상세: `Readme2.md`
- S3 퍼블릭 접근 및 라이프사이클: `Readme3.md`
- IAM Principal vs AssumeRole: `Readme4.md`

## 8) 민감정보 마스킹 기준
- 이메일: `ab***@example.com`
- Access Key: `AKIA****************`
- Account ID: `1234********`
- Bucket: `polly-bucket-edumgt`
- ARN: `arn:aws:iam::1234********:user/ab***`

## 9) 학습 참고 이미지 (DOC/image-0 ~ image-19)
Readme 학습 흐름에 맞춰 관련 이미지를 바로 확인할 수 있도록 첨부 링크를 정리했습니다.

### 클라우드/AWS 공통 기초 · IAM · AWS CLI
![AWS 기초 및 계정 보안](DOC/image-0.png)
![IAM 사용자 및 권한 설정](DOC/image-1.png)
![AWS CLI 환경 구성](DOC/image-2.png)
![CLI 인증/점검 화면](DOC/image-3.png)

### Amazon S3 핵심 개념
![S3 버킷 생성 및 설정](DOC/image-4.png)
![S3 객체 업로드 예시](DOC/image-5.png)
![S3 정책 적용 확인](DOC/image-6.png)

### Node.js + AWS SDK (JavaScript v2)
![Node.js 프로젝트 준비](DOC/image-7.png)
![환경 변수 및 SDK 설정](DOC/image-8.png)
![SDK 호출 결과 확인](DOC/image-9.png)

### Amazon Rekognition (텍스트/얼굴 분석)
![Rekognition 서비스 접근](DOC/image-10.png)
![텍스트 감지 결과](DOC/image-11.png)
![얼굴 비교 입력 이미지](DOC/image-12.png)
![얼굴 비교 결과](DOC/image-13.png)

### 운영/자동화 · 보안 · 비용 점검
![배치 스크립트 실행](DOC/image-14.png)
![자동화 리포트 생성](DOC/image-15.png)
![CloudWatch/모니터링 확인](DOC/image-16.png)
![보안 점검 체크리스트](DOC/image-17.png)
![비용/청구 대시보드](DOC/image-18.png)
![최종 정리 및 확장 로드맵](DOC/image-19.png)

---

## 10) 참고 링크
- Rekognition: https://docs.aws.amazon.com/rekognition/
- S3: https://docs.aws.amazon.com/s3/
- AWS CLI: https://docs.aws.amazon.com/cli/

---
실습 후에는 퍼블릭 정책 해제, 불필요한 키 삭제, 키 로테이션을 반드시 수행하세요.
