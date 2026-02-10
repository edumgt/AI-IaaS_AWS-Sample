# S3 퍼블릭 접근 & Lifecycle 실습 정리

이 문서는 S3 버킷의 공개 접근 제어와 Lifecycle(자동 만료) 설정을 실습 관점에서 설명합니다.
보안 사고를 예방하기 위해, **퍼블릭 접근은 반드시 필요할 때만 최소 범위로 열어야** 합니다.

---

## 1) 버킷 생성

- S3 콘솔: https://s3.console.aws.amazon.com/s3/
- 버킷명: `your-bucket-name` (전역 고유)
- 리전: `ap-northeast-2`

버킷 생성 시 권장사항:
- 버킷 이름에 팀/프로젝트/환경(dev, stg, prod)을 포함
- 기본 암호화(SSE-S3 또는 SSE-KMS) 활성화
- 버전 관리(Versioning) 필요 여부를 사전에 결정

---

## 2) 업로드 확인

```bash
npm run upload
```

실행 후 버킷에 객체가 업로드되었는지 확인합니다.

CLI로 확인:
```bash
aws s3 ls s3://your-bucket-name/
```

---

## 3) 퍼블릭 접근 점검 체크리스트

퍼블릭 공개는 **계정 수준 설정 + 버킷 정책 + 객체 ACL**이 함께 영향을 줍니다.

### 3-1. 퍼블릭 액세스 차단 설정 확인

```bash
aws s3api get-public-access-block --bucket your-bucket-name
```

확인 포인트:
- `BlockPublicAcls`
- `IgnorePublicAcls`
- `BlockPublicPolicy`
- `RestrictPublicBuckets`

이 값이 `true`이면 퍼블릭 정책을 넣어도 실제 접근이 차단될 수 있습니다.

### 3-2. 버킷 정책 적용/확인

```bash
aws s3api put-bucket-policy --bucket your-bucket-name --policy file://bucket.json
aws s3api get-bucket-policy-status --bucket your-bucket-name
```

버킷 정책 예시:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPublicRead",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

주의사항:
- 퍼블릭 공개는 `GetObject`만 허용하고, `PutObject/DeleteObject`는 절대 공개하지 마세요.
- 가능하면 CloudFront + OAC로 비공개 S3를 유지하는 구조를 권장합니다.

### 3-3. 객체 ACL 확인

```bash
aws s3api get-object-acl --bucket your-bucket-name --key file.jpg
```

필요 시 업로드 시점 ACL:
```bash
aws s3 cp file.jpg s3://your-bucket-name/ --acl public-read
```

권장 사항:
- 최신 운영 패턴에서는 ACL보다 버킷 정책 중심 제어를 선호합니다.
- Object Ownership을 `Bucket owner enforced`로 쓰는 경우 ACL 사용이 제한됩니다.

### 3-4. 접근 URL 형식 확인

- `https://your-bucket-name.s3.amazonaws.com/image.jpg`
- `https://your-bucket-name.s3.ap-northeast-2.amazonaws.com/image.jpg`

리전별 엔드포인트가 다를 수 있으므로 실제 버킷 리전을 기준으로 URL을 구성하세요.

---

## 4) Lifecycle(자동 삭제) 설정

Lifecycle은 임시 실습 데이터, 로그, 백업 파일의 보관 비용을 줄이는 데 유용합니다.

설정 적용:
```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket your-bucket-name \
  --lifecycle-configuration file://delete.json
```

예시(`delete.json`):
```json
{
  "Rules": [
    {
      "ID": "AutoDeleteAfter1Days",
      "Filter": { "Prefix": "" },
      "Status": "Enabled",
      "Expiration": { "Days": 1 }
    }
  ]
}
```

> `Day`가 아닌 `Days` 필드를 사용해야 합니다.

확인 명령:
```bash
aws s3api get-bucket-lifecycle-configuration --bucket your-bucket-name
```

---

## 5) 운영 시 주의사항

- Lifecycle은 즉시 반영되지 않으며 보통 24~48시간 내 처리될 수 있습니다.
- 조직 계정 사용 시 SCP/IAM 정책으로 퍼블릭 접근이 제한될 수 있습니다.
- 규정 준수(Compliance)가 필요한 데이터는 자동 삭제 정책과 별도로 보존 정책 검토가 필요합니다.
- 비용 추적을 위해 버킷 태그(`Project`, `Owner`, `Environment`)를 권장합니다.

---

## 6) 권장 아키텍처(실무)

학습 단계 이후에는 아래 구조를 권장합니다.
1. S3 버킷은 비공개 유지
2. CloudFront 배포 생성
3. Origin Access Control(OAC)로 CloudFront만 S3 접근 허용
4. WAF/서명 URL로 공개 범위 제어

이 방식은 퍼블릭 버킷 대비 보안성과 운영 제어 측면에서 더 안전합니다.
