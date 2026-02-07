// 선택한 파일을 Base64(데이터 URL의 본문 부분)로 변환합니다.
async function fileToBase64(file) {
  // 파일이 없으면 즉시 사용자 입력 오류를 알려줍니다.
  if (!file) throw new Error('파일을 선택하세요.');
  // FileReader 콜백 API를 Promise로 감싸 async/await로 사용합니다.
  return new Promise((resolve, reject) => {
    // 브라우저 파일 읽기 전용 객체를 생성합니다.
    const reader = new FileReader();
    // 읽기 성공 시 dataURL의 접두사(data:image/...;base64,)를 제거해 Base64만 반환합니다.
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    // 읽기 실패 시 reject로 에러를 전달합니다.
    reader.onerror = reject;
    // 파일을 dataURL 문자열로 읽기 시작합니다.
    reader.readAsDataURL(file);
  });
}

// 상태 문구를 표시할 DOM 요소의 텍스트를 업데이트합니다.
function setStatus(id, text) {
  // 전달된 id에 해당하는 요소를 찾습니다.
  const el = document.getElementById(id);
  // 요소가 존재할 때만 텍스트를 갱신합니다.
  if (el) el.textContent = text || '';
}

// JSON POST 요청을 보내고 표준화된 에러 처리까지 수행합니다.
async function postJson(url, body) {
  // fetch로 JSON 본문을 전송합니다.
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // non-2xx여도 JSON 에러 본문이 있을 수 있어 우선 파싱을 시도합니다.
  const data = await response.json().catch(() => ({}));
  // HTTP 에러면 메시지를 추출해 Error로 래핑합니다.
  if (!response.ok) {
    const message = data?.message || data?.error || `HTTP ${response.status}`;
    const error = new Error(message);
    // 호출부에서 상세 정보를 확인할 수 있도록 payload를 붙입니다.
    error.payload = data;
    throw error;
  }
  // 정상 응답이면 파싱된 JSON 객체를 반환합니다.
  return data;
}

// Lambda 프록시 응답({statusCode, body})과 일반 JSON 응답을 모두 처리합니다.
function normalizeCompareResponse(raw) {
  // 입력 자체가 없으면 그대로 반환합니다.
  if (!raw) return raw;
  // 프록시 형태인지 판별합니다.
  if (typeof raw === 'object' && typeof raw.statusCode === 'number' && raw.body) {
    try {
      // body가 문자열이면 파싱, 이미 객체면 그대로 사용합니다.
      const parsed = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw.body;
      return parsed;
    } catch (_) {
      // body 파싱 실패 시 에러 메시지 객체로 치환합니다.
      return { message: String(raw.body) };
    }
  }
  // 일반 JSON 형태면 원본을 그대로 사용합니다.
  return raw;
}

// 0~1 정규화 숫자를 퍼센트 문자열로 변환합니다.
function pct(n) {
  // null/undefined/NaN은 '-'로 표시합니다.
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '-';
  // 100을 곱해 소수점 첫째 자리까지 퍼센트 표기로 변환합니다.
  return (Number(n) * 100).toFixed(1) + '%';
}

// 일반 숫자를 지정된 소수점 자리수 문자열로 포맷합니다.
function fmt(n, digits = 2) {
  // 비정상 숫자 입력은 '-'로 표시합니다.
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '-';
  // 숫자를 지정 자릿수로 고정합니다.
  return Number(n).toFixed(digits);
}

// 매칭 여부와 임계값/최대 유사도를 바탕으로 사용자 메시지를 생성합니다.
function makeVerdict({ matched, requestedSimilarityThreshold, maxSimilarity }) {
  // 임계값 숫자를 안전하게 정규화합니다.
  const thr = Number(requestedSimilarityThreshold ?? 0);
  // 최대 유사도 숫자를 안전하게 정규화합니다.
  const max = Number(maxSimilarity ?? 0);
  // 매칭이면 긍정 메시지를 반환합니다.
  if (matched) {
    return `임계값 ${thr}% 기준으로 최대 유사도 ${fmt(max, 2)}% → 동일 인물로 판단됩니다.`;
  }
  // 비매칭이면 부정 메시지를 반환합니다.
  return `임계값 ${thr}% 기준으로 최대 유사도 ${fmt(max, 2)}% → 동일 인물로 보기 어렵습니다.`;
}

// 소스 이미지 파일 input 요소를 참조합니다.
const sourceInput = document.getElementById('sourceImage');
// 타깃 이미지 파일 input 요소를 참조합니다.
const targetInput = document.getElementById('targetImage');
// 유사도 임계값 input 요소를 참조합니다.
const thresholdInput = document.getElementById('similarityThreshold');

// 소스 미리보기 img 요소입니다.
const sourcePreview = document.getElementById('sourcePreview');
// 타깃 미리보기 img 요소입니다.
const targetPreview = document.getElementById('targetPreview');

// 바운딩 박스를 그릴 캔버스 요소입니다.
const canvas = document.getElementById('bboxCanvas');
// 캔버스 2D 렌더링 컨텍스트입니다.
const ctx = canvas.getContext('2d');

// 소스 이미지 Base64 임시 저장 변수입니다.
let sourceImageBase64 = null;
// 타깃 이미지 Base64 임시 저장 변수입니다.
let targetImageBase64 = null;
// 마지막 비교 결과(리사이즈 시 재렌더용)입니다.
let lastCompareResult = null;

// 선택한 파일을 미리보기 이미지에 표시합니다.
function previewImage(file, imgEl) {
  // 파일이 없으면 아무 작업도 하지 않습니다.
  if (!file) return;
  // 브라우저 Blob URL을 생성합니다.
  const url = URL.createObjectURL(file);
  // img src를 Blob URL로 설정해 즉시 프리뷰를 보여줍니다.
  imgEl.src = url;
  // 이미지 로드가 끝나면 Blob URL을 해제해 메모리 누수를 방지합니다.
  imgEl.onload = () => URL.revokeObjectURL(url);
}

// 타깃 이미지 표시 영역 크기에 맞춰 캔버스 해상도를 동기화합니다.
function syncCanvasToTargetImage() {
  // 실제 표시 크기(getBoundingClientRect) 기준으로 맞춰야 박스 오버레이가 정확합니다.
  const rect = targetPreview.getBoundingClientRect();
  // 캔버스 내부 픽셀 너비를 최소 1px 이상으로 설정합니다.
  canvas.width = Math.max(1, Math.round(rect.width));
  // 캔버스 내부 픽셀 높이를 최소 1px 이상으로 설정합니다.
  canvas.height = Math.max(1, Math.round(rect.height));
  // CSS 렌더링 너비를 이미지 표시 너비와 동일하게 맞춥니다.
  canvas.style.width = rect.width + 'px';
  // CSS 렌더링 높이를 이미지 표시 높이와 동일하게 맞춥니다.
  canvas.style.height = rect.height + 'px';
  // 기존 박스는 새 크기 기준으로 다시 그리기 위해 먼저 지웁니다.
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Rekognition BoundingBox를 캔버스에 사각형+라벨로 그립니다.
function drawBoundingBox(box, label, isMatch) {
  // 박스 정보가 없으면 그리지 않습니다.
  if (!box) return;

  // 캔버스 현재 너비를 가져옵니다.
  const w = canvas.width;
  // 캔버스 현재 높이를 가져옵니다.
  const h = canvas.height;

  // 정규화 좌표(0~1)를 실제 픽셀 좌표로 변환합니다.
  const x = box.Left * w;
  const y = box.Top * h;
  const bw = box.Width * w;
  const bh = box.Height * h;

  // 테두리 두께를 설정합니다.
  ctx.lineWidth = 3;
  // 매칭 여부에 따라 초록/빨강 색상을 선택합니다.
  ctx.strokeStyle = isMatch ? '#10b981' : '#ef4444';
  // 얼굴 영역 사각형을 그립니다.
  ctx.strokeRect(x, y, bw, bh);

  // 라벨 텍스트가 있으면 박스 위에 함께 표시합니다.
  if (label) {
    // 라벨 텍스트 폰트를 지정합니다.
    ctx.font = '14px system-ui';
    // 라벨 배경 좌우 패딩 값입니다.
    const pad = 6;
    // 라벨 텍스트 너비를 측정합니다.
    const tw = ctx.measureText(label).width;
    // 라벨 시작 x 좌표는 박스 왼쪽에 맞춥니다.
    const bx = x;
    // 라벨 시작 y 좌표는 박스 위쪽(화면 상단 넘침 방지)으로 배치합니다.
    const by = Math.max(0, y - 22);

    // 라벨 배경 색상도 매칭 여부에 맞춰 설정합니다.
    ctx.fillStyle = isMatch ? '#10b981' : '#ef4444';
    // 라벨 배경 사각형을 그립니다.
    ctx.fillRect(bx, by, tw + pad * 2, 20);
    // 라벨 텍스트는 흰색으로 렌더링합니다.
    ctx.fillStyle = '#ffffff';
    // 배경 위에 라벨 문자열을 그립니다.
    ctx.fillText(label, bx + pad, by + 15);
  }
}

// 비교 API 응답을 화면 카드/테이블/캔버스에 렌더링합니다.
function renderCompareResult(raw) {
  // 결과를 출력할 루트 요소를 찾습니다.
  const resultEl = document.getElementById('compareResult');
  // 응답 형태를 통일해 렌더링 안정성을 높입니다.
  const data = normalizeCompareResponse(raw);

  // 마지막 결과를 저장해 리사이즈 시 재사용합니다.
  lastCompareResult = data;
  // 타깃 이미지 크기에 맞춰 캔버스 크기를 먼저 동기화합니다.
  syncCanvasToTargetImage();

  // 데이터가 없거나 에러 메시지를 포함하면 오류 카드로 렌더링합니다.
  if (!data || data.message) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    resultEl.innerHTML = `
      <div class="card">
        <span class="badge no">ERROR</span>
        <div class="verdict">${data?.message || '알 수 없는 오류'}</div>
        <details class="debug" open>
          <summary>원본 응답(JSON)</summary>
          <pre>${escapeHtml(JSON.stringify(raw, null, 2))}</pre>
        </details>
      </div>
    `;
    return;
  }

  // matches가 유사도 순이라는 보장이 없어 복사 후 내림차순 정렬합니다.
  const matches = Array.isArray(data.matches) ? [...data.matches] : [];
  matches.sort((a, b) => Number(b.similarity || 0) - Number(a.similarity || 0));

  // 매칭 여부를 불리언으로 정규화합니다.
  const matched = Boolean(data.matched);
  // 임계값을 숫자로 정규화합니다.
  const thr = Number(data.requestedSimilarityThreshold ?? 0);
  // 최대 유사도는 응답 필드 우선, 없으면 정렬된 첫 매치에서 추론합니다.
  const max = Number(data.maxSimilarity ?? (matches[0]?.similarity ?? 0));

  // 요약 문장을 생성합니다.
  const verdict = makeVerdict({
    matched,
    requestedSimilarityThreshold: thr,
    maxSimilarity: max,
  });

  // 매칭 여부에 따라 상단 배지 스타일/문구를 다르게 설정합니다.
  const badge = matched ? '<span class="badge ok">MATCH</span>' : '<span class="badge no">NO MATCH</span>';

  // 결과 카드(요약 + 통계 + 테이블 + 디버그 JSON)를 구성합니다.
  resultEl.innerHTML = `
    <div class="card">
      ${badge}
      <div class="verdict">${verdict}</div>

      <div class="kvs">
        <div class="kv"><div class="k">Threshold</div><div class="v">${fmt(thr, 0)}%</div></div>
        <div class="kv"><div class="k">Max similarity</div><div class="v">${fmt(max, 2)}%</div></div>
        <div class="kv"><div class="k">Matches</div><div class="v">${matches.length}</div></div>
        <div class="kv"><div class="k">Decision</div><div class="v">${matched ? 'PASS' : 'FAIL'}</div></div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Similarity</th>
            <th>Confidence</th>
            <th>BoundingBox (Left, Top, Width, Height)</th>
          </tr>
        </thead>
        <tbody>
          ${
            matches.length
              ? matches.map((m, i) => {
                  const b = m.boundingBox || {};
                  return `
                    <tr>
                      <td>${i + 1}</td>
                      <td>${fmt(m.similarity, 2)}%</td>
                      <td>${fmt(m.confidence, 2)}%</td>
                      <td>${pct(b.Left)}, ${pct(b.Top)}, ${pct(b.Width)}, ${pct(b.Height)}</td>
                    </tr>
                  `;
                }).join('')
              : `<tr><td colspan="4">매칭 결과가 없습니다.</td></tr>`
          }
        </tbody>
      </table>

      <details class="debug">
        <summary>원본 응답(JSON)</summary>
        <pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>
      </details>
    </div>
  `;

  // 캔버스를 초기화하고 최고 유사도 1건만 시각적으로 강조합니다.
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (matches[0]?.boundingBox) {
    drawBoundingBox(matches[0].boundingBox, `${fmt(matches[0].similarity, 2)}%`, matched);
  }
}

// 템플릿 문자열에 삽입할 JSON/문자열의 HTML 특수문자를 이스케이프합니다.
function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// ---- Compare handlers ----
// 소스 이미지 선택 시 미리보기/인코딩/상태 메시지를 갱신합니다.
sourceInput.addEventListener('change', async () => {
  try {
    const file = sourceInput.files?.[0];
    previewImage(file, sourcePreview);
    sourceImageBase64 = await fileToBase64(file);
    setStatus('compareStatus', '');
  } catch (e) {
    setStatus('compareStatus', e.message);
  }
});

// 타깃 이미지 선택 시 미리보기/인코딩/캔버스 동기화를 수행합니다.
targetInput.addEventListener('change', async () => {
  try {
    const file = targetInput.files?.[0];
    previewImage(file, targetPreview);
    targetImageBase64 = await fileToBase64(file);

    // 이미지 로드 이후 실제 표시 크기로 캔버스를 동기화합니다.
    targetPreview.onload = () => {
      syncCanvasToTargetImage();
      // 기존 결과가 있으면 새 크기에 맞춰 즉시 재렌더합니다.
      if (lastCompareResult?.matches?.[0]?.boundingBox) {
        renderCompareResult(lastCompareResult);
      }
    };

    setStatus('compareStatus', '');
  } catch (e) {
    setStatus('compareStatus', e.message);
  }
});

// 비교 폼 제출 시 API 호출 후 결과 카드를 렌더링합니다.
document.getElementById('compareForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    setStatus('compareStatus', '비교 중...');
    document.getElementById('compareResult').innerHTML = '<div class="card">비교 중...</div>';

    const similarityThreshold = Number(thresholdInput.value || 80);

    if (!sourceImageBase64 || !targetImageBase64) {
      throw new Error('Source/Target 이미지를 모두 선택하세요.');
    }

    const result = await postJson('/api/compare', {
      sourceImageBase64,
      targetImageBase64,
      similarityThreshold,
    });

    renderCompareResult(result);
    setStatus('compareStatus', '');
  } catch (error) {
    renderCompareResult({ message: error.message, detail: error.payload || null });
    setStatus('compareStatus', '오류 발생');
  }
});

// ---- Text handlers (기존 기능 유지) ----
// JSON 객체를 pretty format으로 <pre> 영역에 출력합니다.
function renderJsonPre(id, payload) {
  document.getElementById(id).textContent = JSON.stringify(payload, null, 2);
}

// 텍스트 추출 폼 제출 시 API 호출 후 원본 JSON 결과를 표시합니다.
document.getElementById('textForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    setStatus('textStatus', '추출 중...');
    const file = document.getElementById('textImage').files[0];
    const imageBase64 = await fileToBase64(file);

    const result = await postJson('/api/extract-text', { imageBase64 });
    renderJsonPre('textResult', result);
    setStatus('textStatus', '');
  } catch (error) {
    renderJsonPre('textResult', { message: error.message });
    setStatus('textStatus', '오류 발생');
  }
});

// 창 크기가 변하면 오버레이 박스 정렬이 깨질 수 있어 캔버스/결과를 재동기화합니다.
window.addEventListener('resize', () => {
  if (!targetPreview.src) return;
  syncCanvasToTargetImage();
  if (lastCompareResult) renderCompareResult(lastCompareResult);
});

// 초기 상태 안내 문구를 결과 영역에 미리 출력합니다.
document.getElementById('compareResult').innerHTML = '<div class="card">이미지를 선택하면 결과가 여기에 표시됩니다.</div>';
