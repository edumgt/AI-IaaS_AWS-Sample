# Lambda 운영/백업 실습 가이드

이 문서는 AWS Lambda 함수를 조회하고 백업하는 기본 운영 절차를 정리한 문서입니다.
특히 여러 함수가 있는 계정에서 "현재 배포 상태를 점검"하거나 "코드/설정 백업"이 필요할 때 활용할 수 있습니다.

---

## 1) Lambda 함수 목록 확인

현재 설정된 `AWS_PROFILE`, `AWS_REGION` 기준으로 함수 이름만 조회:

```bash
aws lambda list-functions --query 'Functions[].FunctionName' --output table
```

이름/런타임/수정 시각까지 JSON으로 확인:

```bash
aws lambda list-functions --query 'Functions[].{Name:FunctionName,Runtime:Runtime,LastModified:LastModified}' --output json
```

팁:
- 결과가 없으면 `AWS_REGION` 또는 `AWS_PROFILE`이 다른 환경으로 잡혀 있을 수 있습니다.
- 먼저 아래 명령으로 현재 자격증명 컨텍스트를 확인하세요.

```bash
aws sts get-caller-identity
aws configure list
```

---

## 2) jq 설치 (출력 가공용)

Linux/Ubuntu 환경에서 JSON 파싱을 위해 `jq` 설치:

```bash
sudo apt-get update && sudo apt-get install -y jq
```

`jq`를 사용하면 대량 함수 목록에서 필요한 필드만 추출하기 쉽습니다.

예:
```bash
aws lambda list-functions --output json | jq '.Functions[] | {name:.FunctionName, role:.Role}'
```

---

## 3) 백업 스크립트 실행

실행 권한 부여:

```bash
chmod +x backup_all_lambdas.sh
```

프로파일/리전 지정 후 실행:

```bash
AWS_PROFILE=default AWS_REGION=ap-northeast-2 ./backup_all_lambdas.sh
```

일반적으로 백업 스크립트는 아래 항목을 저장합니다.
- 함수 코드(zip)
- 함수 설정(JSON)
- 환경변수/런타임/메모리/타임아웃 정보

---

## 4) 백업 전 체크리스트

- 백업 저장 경로 용량 확보
- 민감정보(.env, 비밀키)가 출력물에 포함되는지 확인
- KMS 암호화 함수라면 복호화/재배포 권한이 있는지 확인
- 교차 계정 함수일 경우 대상 계정 권한 위임(AssumeRole) 준비

---

## 5) 운영 권장사항

- 정기 백업: cron 또는 CI 파이프라인으로 주기 실행
- 버전 관리: 날짜/커밋 해시 기준으로 폴더 구분
- 복구 리허설: 백업이 "진짜 복구 가능한지" 분기별 점검
- 최소 권한: `lambda:GetFunction`, `lambda:GetFunctionConfiguration` 중심 권한 설계

---

## 6) 트러블슈팅

### `AccessDeniedException`
- 원인: Lambda 조회/다운로드 권한 부족
- 대응: IAM 정책에 `lambda:ListFunctions`, `lambda:GetFunction` 추가

### `ResourceNotFoundException`
- 원인: 함수명 오타 또는 리전 불일치
- 대응: `aws lambda list-functions --region ...`로 실제 함수 존재 확인

### 다운로드 링크 만료
- 원인: `GetFunction`의 코드 URL은 시간 제한이 있음
- 대응: 백업 시 즉시 다운로드하도록 스크립트 구성
