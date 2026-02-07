#!/usr/bin/env bash
set -euo pipefail

BUCKET_NAME="${S3_BUCKET_NAME:-polly-bucket-edumgt}"
AWS_REGION="${AWS_REGION:-ap-northeast-2}"
PROFILE_OPT="${AWS_PROFILE:+--profile ${AWS_PROFILE}}"
WORK_DIR="${WORK_DIR:-./batch-work}"
UPLOAD_DIR="${UPLOAD_DIR:-./server}"
REPORT_FILE="${REPORT_FILE:-${WORK_DIR}/batch-report-$(date +%Y%m%d-%H%M%S).txt}"
LAMBDA_RUNTIME="${LAMBDA_RUNTIME:-nodejs18.x}"
LAMBDA_ROLE_ARN="${LAMBDA_ROLE_ARN:-}"
LAMBDA_UPLOAD_FUNCTION="${LAMBDA_UPLOAD_FUNCTION:-rekognition-face-upload}"
LAMBDA_COMPARE_FUNCTION="${LAMBDA_COMPARE_FUNCTION:-rekognition-face-compare}"
LAMBDA_TIMEOUT="${LAMBDA_TIMEOUT:-30}"
LAMBDA_MEMORY_SIZE="${LAMBDA_MEMORY_SIZE:-256}"

mkdir -p "${WORK_DIR}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

run_aws() {
  # shellcheck disable=SC2086
  aws $PROFILE_OPT --region "${AWS_REGION}" "$@"
}

usage() {
  cat <<USAGE
Usage: $(basename "$0") <command>

Commands:
  init                 Create bucket(if absent), enable default encryption, and apply lifecycle
  upload               Upload sample assets to s3://${BUCKET_NAME}/training/
  sync                 Sync local images (*.png, *.jpg, *.jpeg) to s3://${BUCKET_NAME}/training/
  list                 List objects under training/
  report               Save bucket inventory report to ${REPORT_FILE}
  cleanup              Delete objects under training/ (safe cleanup)
  lambda-package       Package Lambda sources into batch-work/*.zip
  lambda-deploy        Create/update Lambda functions for upload+compare handlers
  lambda-invoke        Invoke upload and compare Lambda sequentially
  lab-all              Run init -> upload -> lambda-deploy -> lambda-invoke -> report

Environment variables:
  AWS_PROFILE          Optional AWS profile name
  AWS_REGION           Region (default: ap-northeast-2)
  S3_BUCKET_NAME       Bucket name (default: polly-bucket-edumgt)
  UPLOAD_DIR           Local source dir containing sample images (default: ./server)
  WORK_DIR             Working directory (default: ./batch-work)
  LAMBDA_ROLE_ARN      Required for lambda-deploy (IAM role for Lambda)
  LAMBDA_UPLOAD_FUNCTION   Upload Lambda function name
  LAMBDA_COMPARE_FUNCTION  Compare Lambda function name
USAGE
}

create_lifecycle_json() {
  cat > "${WORK_DIR}/lifecycle.json" <<JSON
{
  "Rules": [
    {
      "ID": "ExpireTrainingObjects",
      "Filter": {"Prefix": "training/"},
      "Status": "Enabled",
      "Expiration": {"Days": 30},
      "AbortIncompleteMultipartUpload": {"DaysAfterInitiation": 7}
    }
  ]
}
JSON
}

init_bucket() {
  log "Checking caller identity"
  run_aws sts get-caller-identity >/dev/null

  if run_aws s3api head-bucket --bucket "${BUCKET_NAME}" >/dev/null 2>&1; then
    log "Bucket already exists: ${BUCKET_NAME}"
  else
    log "Creating bucket: ${BUCKET_NAME} (${AWS_REGION})"
    if [[ "${AWS_REGION}" == "us-east-1" ]]; then
      run_aws s3api create-bucket --bucket "${BUCKET_NAME}"
    else
      run_aws s3api create-bucket --bucket "${BUCKET_NAME}" \
        --create-bucket-configuration "LocationConstraint=${AWS_REGION}"
    fi
  fi

  log "Applying default bucket encryption"
  run_aws s3api put-bucket-encryption \
    --bucket "${BUCKET_NAME}" \
    --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

  create_lifecycle_json
  log "Applying lifecycle policy"
  run_aws s3api put-bucket-lifecycle-configuration \
    --bucket "${BUCKET_NAME}" \
    --lifecycle-configuration "file://${WORK_DIR}/lifecycle.json"

  log "Init completed"
}

upload_samples() {
  log "Uploading known sample assets from ${UPLOAD_DIR}"
  for f in sample.png face1.png face2.png face3.png face4.png; do
    if [[ -f "${UPLOAD_DIR}/${f}" ]]; then
      run_aws s3 cp "${UPLOAD_DIR}/${f}" "s3://${BUCKET_NAME}/training/${f}"
    else
      log "Skip missing file: ${UPLOAD_DIR}/${f}"
    fi
  done
}

sync_images() {
  log "Syncing image files from ${UPLOAD_DIR} to s3://${BUCKET_NAME}/training/"
  run_aws s3 sync "${UPLOAD_DIR}" "s3://${BUCKET_NAME}/training/" \
    --exclude "*" --include "*.png" --include "*.jpg" --include "*.jpeg"
}

list_objects() {
  run_aws s3 ls "s3://${BUCKET_NAME}/training/" --recursive
}

create_report() {
  {
    echo "# Batch Report"
    echo "Generated: $(date -Iseconds)"
    echo "Bucket: ${BUCKET_NAME}"
    echo "Region: ${AWS_REGION}"
    echo
    echo "## Caller Identity"
    run_aws sts get-caller-identity
    echo
    echo "## Bucket Location"
    run_aws s3api get-bucket-location --bucket "${BUCKET_NAME}"
    echo
    echo "## Object List (training/)"
    run_aws s3 ls "s3://${BUCKET_NAME}/training/" --recursive || true
  } >"${REPORT_FILE}"

  log "Report generated at ${REPORT_FILE}"
}

cleanup_objects() {
  log "Removing objects in s3://${BUCKET_NAME}/training/"
  run_aws s3 rm "s3://${BUCKET_NAME}/training/" --recursive
}

package_lambda() {
  local upload_zip="${WORK_DIR}/lambda-upload.zip"
  local compare_zip="${WORK_DIR}/lambda-compare.zip"

  log "Packaging Lambda source files"
  (
    cd server
    zip -qr "../${upload_zip}" lambda/uploadFacesHandler.js src node_modules package.json package-lock.json
    zip -qr "../${compare_zip}" lambda/compareFacesHandler.js src node_modules package.json package-lock.json
  )

  log "Packaged: ${upload_zip}, ${compare_zip}"
}

upsert_lambda() {
  local function_name="$1"
  local handler="$2"
  local zip_file="$3"

  if run_aws lambda get-function --function-name "${function_name}" >/dev/null 2>&1; then
    log "Updating code for Lambda: ${function_name}"
    run_aws lambda update-function-code \
      --function-name "${function_name}" \
      --zip-file "fileb://${zip_file}" >/dev/null

    run_aws lambda update-function-configuration \
      --function-name "${function_name}" \
      --handler "${handler}" \
      --runtime "${LAMBDA_RUNTIME}" \
      --timeout "${LAMBDA_TIMEOUT}" \
      --memory-size "${LAMBDA_MEMORY_SIZE}" \
      --environment "Variables={AWS_REGION=${AWS_REGION},S3_BUCKET_NAME=${BUCKET_NAME}}" >/dev/null
  else
    if [[ -z "${LAMBDA_ROLE_ARN}" ]]; then
      echo "LAMBDA_ROLE_ARN is required to create a new Lambda function." >&2
      exit 1
    fi

    log "Creating Lambda: ${function_name}"
    run_aws lambda create-function \
      --function-name "${function_name}" \
      --runtime "${LAMBDA_RUNTIME}" \
      --role "${LAMBDA_ROLE_ARN}" \
      --handler "${handler}" \
      --timeout "${LAMBDA_TIMEOUT}" \
      --memory-size "${LAMBDA_MEMORY_SIZE}" \
      --zip-file "fileb://${zip_file}" \
      --environment "Variables={AWS_REGION=${AWS_REGION},S3_BUCKET_NAME=${BUCKET_NAME}}" >/dev/null
  fi
}

deploy_lambda() {
  package_lambda

  upsert_lambda "${LAMBDA_UPLOAD_FUNCTION}" "lambda/uploadFacesHandler.handler" "${WORK_DIR}/lambda-upload.zip"
  upsert_lambda "${LAMBDA_COMPARE_FUNCTION}" "lambda/compareFacesHandler.handler" "${WORK_DIR}/lambda-compare.zip"

  log "Lambda deploy completed"
}

invoke_lambda() {
  log "Invoking Lambda: ${LAMBDA_UPLOAD_FUNCTION}"
  run_aws lambda invoke \
    --function-name "${LAMBDA_UPLOAD_FUNCTION}" \
    --cli-binary-format raw-in-base64-out \
    --payload '{}' "${WORK_DIR}/upload-result.json" >/dev/null

  log "Invoking Lambda: ${LAMBDA_COMPARE_FUNCTION}"
  run_aws lambda invoke \
    --function-name "${LAMBDA_COMPARE_FUNCTION}" \
    --cli-binary-format raw-in-base64-out \
    --payload '{}' "${WORK_DIR}/compare-result.json" >/dev/null

  log "Lambda invoke outputs: ${WORK_DIR}/upload-result.json, ${WORK_DIR}/compare-result.json"
}

run_lab_all() {
  init_bucket
  upload_samples
  deploy_lambda
  invoke_lambda
  create_report
}

main() {
  local cmd="${1:-}"
  case "${cmd}" in
    init) init_bucket ;;
    upload) upload_samples ;;
    sync) sync_images ;;
    list) list_objects ;;
    report) create_report ;;
    cleanup) cleanup_objects ;;
    lambda-package) package_lambda ;;
    lambda-deploy) deploy_lambda ;;
    lambda-invoke) invoke_lambda ;;
    lab-all) run_lab_all ;;
    *) usage; exit 1 ;;
  esac
}

main "$@"
