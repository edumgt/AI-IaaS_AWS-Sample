## 보완 설명

IAM(Identity and Access Management)에서 Principal과 Assume은 AWS 리소스에 권한을 위임하거나 역할(Role)을 사용하는 방식에서 매우 중요한 개념입니다. 특히 Role을 다른 사용자나 서비스가 사용할 수 있도록 설정할 때 이 두 키워드가 사용됩니다.

✅ 1. Principal이란?
Principal은 AWS 리소스에 액세스하려는 주체(사람 또는 서비스)를 의미합니다.
즉, "누가 요청하는가?"를 나타내며 다음과 같은 형태일 수 있습니다:

유형	예시
IAM 사용자	"AWS": "arn:aws:iam::123456789012:user/Alice"
IAM 역할	"AWS": "arn:aws:iam::123456789012:role/Developer"
AWS 서비스	"Service": "lambda.amazonaws.com"
계정 전체	"AWS": "arn:aws:iam::123456789012:root"

🔹 예시: Lambda 서비스가 역할을 사용할 수 있도록 허용
"Principal": {
  "Service": "lambda.amazonaws.com"
}
✅ 2. AssumeRole 이란?
AssumeRole은 주체(Principal)가 다른 역할(Role)을 "가정"해서 그 역할의 권한을 잠시 사용하는 것입니다.
주로 **STS(Security Token Service)**를 통해 임시 자격 증명을 발급받는 방식입니다.

즉:

"A 사용자"가 "B 역할"을 사용하려면

"B 역할"의 Trust Policy에 **"A 사용자가 이 역할을 사용할 수 있다"**고 명시해야 함

🔹 예시: 특정 IAM 사용자가 역할을 사용할 수 있도록 설정
역할 B의 신뢰 정책(Trust Policy):

{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:user/Alice"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
✅ 정리: Principal vs AssumeRole
구분	설명	예시
Principal	"누가 사용할 수 있는가?" (역할을 사용하는 주체)	Lambda, 특정 IAM 사용자, 다른 계정
sts:AssumeRole	"역할을 사용할 수 있도록 허용하는 액션"	Lambda, EC2, 외부 계정 사용자 등이 역할을 Assume 할 수 있도록 함

✅ 보너스: 실제 흐름 예시 (Lambda → S3 접근)
Lambda 함수는 S3에 접근해야 함

IAM Role LambdaAccessRole을 생성하고,

이 역할에 S3에 대한 접근 권한을 부여

LambdaAccessRole의 **신뢰 정책(Trust Policy)**에 다음을 설정:

{
  "Effect": "Allow",
  "Principal": {
    "Service": "lambda.amazonaws.com"
  },
  "Action": "sts:AssumeRole"
}
이제 Lambda 함수는 해당 역할을 자동 Assume 하여 실행 시 S3에 접근 가능