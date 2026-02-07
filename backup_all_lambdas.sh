#!/usr/bin/env bash
set -euo pipefail

AWS_PROFILE="${AWS_PROFILE:-default}"
AWS_REGION="${AWS_REGION:-ap-northeast-2}"
OUT_DIR="${OUT_DIR:-lambda-backup-$(date +%Y%m%d-%H%M%S)}"
ALIAS_NAME="${ALIAS_NAME:-backup-v1}"

AWS="aws --profile ${AWS_PROFILE} --region ${AWS_REGION}"

mkdir -p "$OUT_DIR"

echo "== Listing functions..."
FUNCTIONS=$($AWS lambda list-functions --query 'Functions[].FunctionName' --output text)

if [[ -z "${FUNCTIONS// }" ]]; then
  echo "No Lambda functions found."
  exit 0
fi

for FN in $FUNCTIONS; do
  echo
  echo "============================================================"
  echo "Function: $FN"
  echo "============================================================"

  FN_DIR="$OUT_DIR/$FN"
  mkdir -p "$FN_DIR"

  # 1) 코드/메타 포함 get-function
  echo "[1/6] get-function (code location + config)"
  $AWS lambda get-function --function-name "$FN" > "$FN_DIR/get-function.json"

  # 코드 다운로드 URL 추출 후 zip 저장 (pre-signed URL)
  CODE_URL=$(jq -r '.Code.Location' "$FN_DIR/get-function.json")
  if [[ "$CODE_URL" != "null" && -n "$CODE_URL" ]]; then
    echo "      downloading code zip..."
    curl -L "$CODE_URL" -o "$FN_DIR/code.zip"
  else
    echo "      no code location found (unexpected)."
  fi

  # 2) 구성만 별도로 (복원/비교용)
  echo "[2/6] get-function-configuration"
  $AWS lambda get-function-configuration --function-name "$FN" > "$FN_DIR/configuration.json"

  # 3) 태그
  echo "[3/6] list-tags"
  # FunctionArn은 config에서 가져오는 게 안전
  ARN=$(jq -r '.FunctionArn' "$FN_DIR/configuration.json")
  $AWS lambda list-tags --resource "$ARN" > "$FN_DIR/tags.json"

  # 4) 이벤트 소스 매핑 (SQS/Kinesis/DynamoDB Streams 등)
  echo "[4/6] list-event-source-mappings"
  $AWS lambda list-event-source-mappings --function-name "$FN" > "$FN_DIR/event-source-mappings.json"

  # 5) 리소스 기반 정책(있을 때만) - 없으면 에러 날 수 있으니 무시
  echo "[5/6] get-policy (if any)"
  if $AWS lambda get-policy --function-name "$FN" > "$FN_DIR/policy.json" 2>/dev/null; then
    :
  else
    echo "      (no resource policy)"
  fi

  # 6) “백업용 버전 발행” + alias로 고정
  #    ※ 버전번호는 자동 증가: 이미 버전이 있으면 1이 아닐 수 있음
  echo "[6/6] publish-version + alias($ALIAS_NAME)"
  DESC="backup snapshot $(date -Iseconds)"
  PUBLISHED_JSON=$($AWS lambda publish-version --function-name "$FN" --description "$DESC")
  VERSION=$(echo "$PUBLISHED_JSON" | jq -r '.Version')

  echo "      published version: $VERSION"

  # alias 존재 여부 확인 후 create/update
  if $AWS lambda get-alias --function-name "$FN" --name "$ALIAS_NAME" >/dev/null 2>&1; then
    $AWS lambda update-alias \
      --function-name "$FN" \
      --name "$ALIAS_NAME" \
      --function-version "$VERSION" \
      --description "backup point 1 (alias) updated at $(date -Iseconds)" \
      > "$FN_DIR/alias-${ALIAS_NAME}.json"
  else
    $AWS lambda create-alias \
      --function-name "$FN" \
      --name "$ALIAS_NAME" \
      --function-version "$VERSION" \
      --description "backup point 1 (alias) created at $(date -Iseconds)" \
      > "$FN_DIR/alias-${ALIAS_NAME}.json"
  fi

  # 기록용
  echo "$PUBLISHED_JSON" > "$FN_DIR/published-version.json"
done

echo
echo "DONE. Backup saved to: $OUT_DIR"
