#!/usr/bin/env bash
set -euo pipefail

# Fixed bucket requested by project requirement
BUCKET_NAME="polly-bucket-edumgt"
AWS_REGION="${AWS_REGION:-ap-northeast-2}"
PROFILE_OPT="${AWS_PROFILE:+--profile ${AWS_PROFILE}}"
WORK_DIR="${WORK_DIR:-./batch-work}"
UPLOAD_DIR="${UPLOAD_DIR:-./}"
REPORT_FILE="${REPORT_FILE:-${WORK_DIR}/batch-report-$(date +%Y%m%d-%H%M%S).txt}"

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
  init       Create bucket(if absent), enable default encryption, and apply lifecycle
  upload     Upload sample assets to s3://${BUCKET_NAME}/training/
  sync       Sync local images (*.png, *.jpg, *.jpeg) to s3://${BUCKET_NAME}/training/
  list       List objects under training/
  report     Save bucket inventory report to ${REPORT_FILE}
  cleanup    Delete objects under training/ (safe cleanup)

Environment variables:
  AWS_PROFILE   Optional AWS profile name
  AWS_REGION    Region (default: ap-northeast-2)
  UPLOAD_DIR    Local source directory for sync/upload (default: ./)
  WORK_DIR      Working directory for generated json/report (default: ./batch-work)
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
  log "Uploading known sample assets"
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

main() {
  local cmd="${1:-}"
  case "${cmd}" in
    init) init_bucket ;;
    upload) upload_samples ;;
    sync) sync_images ;;
    list) list_objects ;;
    report) create_report ;;
    cleanup) cleanup_objects ;;
    *) usage; exit 1 ;;
  esac
}

main "$@"
