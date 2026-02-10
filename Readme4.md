# IAM 핵심 개념 정리: Principal vs AssumeRole

이 문서는 IAM 정책을 읽을 때 가장 많이 등장하는 두 개념인 **Principal**과 **AssumeRole**을 실무 관점에서 정리합니다.
처음 AWS 권한 모델을 접할 때 헷갈리는 포인트를 예시 중심으로 설명합니다.

---

## 1) Principal이란?

Principal은 AWS 리소스에 접근을 시도하는 **주체**입니다.

예시:
- IAM 사용자: `"AWS": "arn:aws:iam::1234********:user/ab***"`
- IAM 역할: `"AWS": "arn:aws:iam::1234********:role/Developer"`
- AWS 서비스: `"Service": "lambda.amazonaws.com"`
- 계정 루트: `"AWS": "arn:aws:iam::1234********:root"`

Lambda가 역할을 사용할 수 있도록 허용하는 예:
```json
"Principal": {
  "Service": "lambda.amazonaws.com"
}
```

핵심 포인트:
- Principal은 **누가 요청하는지**를 나타냅니다.
- Principal만 있다고 권한이 생기지는 않으며, 정책의 `Action`/`Resource` 조건을 함께 만족해야 합니다.

---

## 2) AssumeRole이란?

`sts:AssumeRole`은 Principal이 특정 Role의 권한을 **임시로 위임받아 사용**하도록 허용하는 액션입니다.

신뢰 정책(Trust Policy) 예시:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::1234********:user/ab***"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

핵심 포인트:
- AssumeRole 성공 시 영구 키가 아닌 **임시 자격증명(AccessKey/Secret/SessionToken)** 이 발급됩니다.
- 임시 권한은 만료시간이 있어 보안상 유리합니다.
- Role 신뢰 정책(누가 Assume 가능한가)과 권한 정책(무엇을 할 수 있는가)은 별개입니다.

---

## 3) 정책 구조를 읽는 방법

IAM 정책을 읽을 때는 다음 순서로 보면 이해가 빠릅니다.
1. **누가(Principal)** 요청하는가?
2. **무엇을(Action)** 하려는가?
3. **어디에(Resource)** 수행하는가?
4. **어떤 조건(Condition)** 이 필요한가?

이 4개를 분리해 읽으면 복잡한 정책도 빠르게 디버깅할 수 있습니다.

---

## 4) 요약

- Principal: “누가 역할을 사용할 수 있는가?”
- `sts:AssumeRole`: “그 역할 사용을 허용하는 액션”
- Role Trust Policy: “누가 이 Role을 Assume 가능한가”
- Role Permission Policy: “Assume 후 어떤 AWS 작업을 할 수 있는가”

---

## 5) 실무 예시 (Lambda → S3)

1. `LambdaAccessRole` 생성
2. 해당 역할에 S3 권한 정책 연결
3. 역할의 Trust Policy에서 Lambda 서비스 Principal 허용

```json
{
  "Effect": "Allow",
  "Principal": {
    "Service": "lambda.amazonaws.com"
  },
  "Action": "sts:AssumeRole"
}
```

이후 Lambda 함수는 실행 시 해당 역할을 자동 Assume 하여 S3에 접근할 수 있습니다.

---

## 6) 자주 하는 실수

- Trust Policy에 `Principal` 누락
- Permission Policy만 설정하고 Trust Policy를 비워둠
- Lambda 실행 Role에 S3 `GetObject`만 주고 `ListBucket`이 필요한 케이스를 누락
- 교차 계정에서 외부 ID(`sts:ExternalId`) 조건을 설정하지 않음

문제 해결 팁:
- CloudTrail에서 `AssumeRole` 실패 이벤트를 확인
- `aws sts assume-role` CLI로 수동 재현
- 정책 시뮬레이터(IAM Policy Simulator)로 최소 재현 케이스 검증
