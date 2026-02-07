# 기본(현재 설정된 region/profile 기준)
aws lambda list-functions --query 'Functions[].FunctionName' --output table

# JSON으로
aws lambda list-functions --query 'Functions[].{Name:FunctionName,Runtime:Runtime,LastModified:LastModified}' --output json

sudo apt-get update && sudo apt-get install -y jq

chmod +x backup_all_lambdas.sh

AWS_PROFILE=default AWS_REGION=ap-northeast-2 ./backup_all_lambdas.sh
