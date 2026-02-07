# AWS Rekognition 실습 리팩토링 가이드 (Node.js + Lambda + Shell 자동화)

이 문서는 이 저장소를 **실습 중심으로 재구성**한 최신 가이드입니다.  
목표는 아래 3가지를 한 번에 수행하는 것입니다.

1. `server` 기반 Node.js 코드로 Rekognition 실습 환경 구성
2. `face1.png ~ face4.png` 업로드 및 유사성 분석을 **AWS Lambda**로 실행
3. `scripts/aws_batch_ops.sh` 하나로 **버킷 준비 → Lambda 배포/호출 → 결과 수집** 자동화

---

## 1) 리팩토링 핵심 구조

```bash
.
├─ server/
│  ├─ src/
│  │  ├─ awsClients.js         # AWS SDK 클라이언트 초기화
│  │  ├─ config.js             # 환경변수/실습 기본값 관리
│  │  ├─ fileUtils.js          # 이미지 파일 로딩 유틸
│  │  └─ faceWorkflow.js       # 얼굴 업로드 + 얼굴 비교 비즈니스 로직
│  ├─ lambda/
│  │  ├─ uploadFacesHandler.js # Lambda: face1~4 S3 업로드
│  │  └─ compareFacesHandler.js# Lambda: face1~4 유사도 비교
│  ├─ upload.js                # 로컬 실행용 업로드 엔트리
│  ├─ compare.js               # 로컬 실행용 비교 엔트리
│  └─ extract.js               # 텍스트 감지 샘플
└─ scripts/
   └─ aws_batch_ops.sh         # 버킷/Lambda/실습 배치 자동화
```

---

## 2) 사전 준비

- AWS 계정, IAM 사용자(또는 Role) 준비
- 최소 권한 권장 정책
  - S3: 버킷 생성/설정/업로드/조회
  - Lambda: 함수 생성/수정/호출
  - Rekognition: `CompareFaces`, `DetectText`
  - IAM: Lambda 생성 시 Role 조회 권한
- 로컬 도구
  - Node.js 18+
  - npm
  - AWS CLI v2
  - zip 명령어

---

## 3) 환경 변수 설정

루트 또는 `server/.env` 기준으로 아래 값 설정:

```env
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=AKIA****************
AWS_SECRET_ACCESS_KEY=********************************
S3_BUCKET_NAME=polly-bucket-edumgt
SIMILARITY_THRESHOLD=80
FACE_FILES=face1.png,face2.png,face3.png,face4.png
```

> 실제 운영에서는 Access Key보다 IAM Role(예: EC2/CloudShell/Lambda 실행 역할)을 우선 권장합니다.

---

## 4) 로컬 실행(빠른 검증)

```bash
cd server
npm install
npm run upload:faces
npm run compare:faces
npm run extract
```

- `upload:faces`: `training/face1~4.png` 경로로 S3 업로드
- `compare:faces`: face1~4를 조합 비교하여 유사도 출력
- `extract`: `sample.png` 텍스트 검출

---

## 5) Lambda 배포 자동화 (핵심)

`scripts/aws_batch_ops.sh`가 Lambda 실습용 명령을 제공합니다.

### 5-1. 기본 배치 명령

```bash
# 버킷 초기화(없으면 생성, 암호화/lifecycle 적용)
./scripts/aws_batch_ops.sh init

# 샘플 파일 업로드(face1~4 + sample)
./scripts/aws_batch_ops.sh upload

# Lambda 배포 zip 생성
./scripts/aws_batch_ops.sh lambda-package
```

### 5-2. Lambda 함수 생성/업데이트

최초 생성 시 `LAMBDA_ROLE_ARN`이 필요합니다.

```bash
export AWS_REGION=ap-northeast-2
export S3_BUCKET_NAME=polly-bucket-edumgt
export LAMBDA_ROLE_ARN=arn:aws:iam::1234********:role/rekognition-lambda-role

./scripts/aws_batch_ops.sh lambda-deploy
```

자동으로 아래 함수가 생성(또는 업데이트)됩니다.

- `rekognition-face-upload` (`lambda/uploadFacesHandler.handler`)
- `rekognition-face-compare` (`lambda/compareFacesHandler.handler`)

### 5-3. Lambda 호출 및 결과 파일 확인

```bash
./scripts/aws_batch_ops.sh lambda-invoke
```

결과 파일:

- `batch-work/upload-result.json`
- `batch-work/compare-result.json`

### 5-4. 실습 원클릭 파이프라인

```bash
./scripts/aws_batch_ops.sh lab-all
```

실행 순서:

1. `init`
2. `upload`
3. `lambda-deploy`
4. `lambda-invoke`
5. `report`

---

## 6) 스크립트 환경 변수 상세

- `AWS_PROFILE`: AWS CLI 프로파일 사용 시 지정
- `AWS_REGION`: 리전
- `S3_BUCKET_NAME`: 버킷명(기본 `polly-bucket-edumgt`)
- `UPLOAD_DIR`: 샘플 이미지 소스 경로(기본 `./server`)
- `WORK_DIR`: zip/리포트 출력 경로(기본 `./batch-work`)
- `LAMBDA_ROLE_ARN`: Lambda 생성 시 필요
- `LAMBDA_UPLOAD_FUNCTION`: 업로드 함수명 기본값
- `LAMBDA_COMPARE_FUNCTION`: 비교 함수명 기본값

---

## 7) 실습 체크리스트

- [ ] `aws sts get-caller-identity` 정상 응답
- [ ] `init` 후 버킷 암호화, lifecycle 정책 적용 확인
- [ ] `upload` 후 `training/face1~4.png` 존재 확인
- [ ] `lambda-deploy` 성공 로그 확인
- [ ] `lambda-invoke` 결과 JSON에서 유사도 값 확인
- [ ] `report` 파일 생성 확인

---

## 8) 트러블슈팅

1. **Lambda 생성 실패 (`AccessDenied`)**
   - `LAMBDA_ROLE_ARN`의 신뢰 정책(Trust Policy)에 `lambda.amazonaws.com` 포함 여부 확인

2. **`InvalidParameterValueException` (핸들러/런타임 오류)**
   - 핸들러 문자열이 아래와 일치하는지 확인
     - `lambda/uploadFacesHandler.handler`
     - `lambda/compareFacesHandler.handler`

3. **S3 업로드 실패**
   - `S3_BUCKET_NAME`, 리전, 버킷 정책, 퍼블릭 차단과 무관한 IAM 권한 확인

4. **유사도 결과가 0 또는 낮음**
   - 입력 이미지 품질, 얼굴 정면 여부, 조명 조건을 조정
   - `SIMILARITY_THRESHOLD`를 70~90 범위에서 실험

---

## 9) 비용/보안 정리

실습 후 반드시 아래를 수행하세요.

- 불필요한 Lambda 함수 삭제
- 테스트 객체 정리: `./scripts/aws_batch_ops.sh cleanup`
- Access Key 미사용 시 비활성화/삭제
- CloudWatch 로그 보존 기간 설정

---

## 10) 참고

- Amazon Rekognition Docs: https://docs.aws.amazon.com/rekognition/
- AWS Lambda Docs: https://docs.aws.amazon.com/lambda/
- AWS CLI Docs: https://docs.aws.amazon.com/cli/
