async function fileToBase64(file) {
  if (!file) throw new Error('파일을 선택하세요.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]); // dataURL prefix 제거
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setStatus(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || '';
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // 서버가 non-2xx여도 json을 줄 수 있으므로 일단 파싱 시도
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.message || data?.error || `HTTP ${response.status}`;
    const error = new Error(message);
    error.payload = data;
    throw error;
  }
  return data;
}

// Lambda 프록시 형태({statusCode, body}) 또는 바로 JSON 형태 모두 지원
function normalizeCompareResponse(raw) {
  if (!raw) return raw;
  if (typeof raw === 'object' && typeof raw.statusCode === 'number' && raw.body) {
    try {
      const parsed = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw.body;
      return parsed;
    } catch (_) {
      return { message: String(raw.body) };
    }
  }
  return raw;
}

function pct(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '-';
  return (Number(n) * 100).toFixed(1) + '%';
}

function fmt(n, digits = 2) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '-';
  return Number(n).toFixed(digits);
}

function makeVerdict({ matched, requestedSimilarityThreshold, maxSimilarity }) {
  const thr = Number(requestedSimilarityThreshold ?? 0);
  const max = Number(maxSimilarity ?? 0);
  if (matched) {
    return `임계값 ${thr}% 기준으로 최대 유사도 ${fmt(max, 2)}% → 동일 인물로 판단됩니다.`;
  }
  return `임계값 ${thr}% 기준으로 최대 유사도 ${fmt(max, 2)}% → 동일 인물로 보기 어렵습니다.`;
}

const sourceInput = document.getElementById('sourceImage');
const targetInput = document.getElementById('targetImage');
const thresholdInput = document.getElementById('similarityThreshold');

const sourcePreview = document.getElementById('sourcePreview');
const targetPreview = document.getElementById('targetPreview');

const canvas = document.getElementById('bboxCanvas');
const ctx = canvas.getContext('2d');

let sourceImageBase64 = null;
let targetImageBase64 = null;
let lastCompareResult = null;

function previewImage(file, imgEl) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  imgEl.src = url;
  imgEl.onload = () => URL.revokeObjectURL(url);
}

function syncCanvasToTargetImage() {
  // display size 기준으로 캔버스를 맞춰야 boundingBox가 정확히 올라갑니다.
  const rect = targetPreview.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width));
  canvas.height = Math.max(1, Math.round(rect.height));
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawBoundingBox(box, label, isMatch) {
  if (!box) return;

  const w = canvas.width;
  const h = canvas.height;

  const x = box.Left * w;
  const y = box.Top * h;
  const bw = box.Width * w;
  const bh = box.Height * h;

  ctx.lineWidth = 3;
  ctx.strokeStyle = isMatch ? '#10b981' : '#ef4444';
  ctx.strokeRect(x, y, bw, bh);

  if (label) {
    ctx.font = '14px system-ui';
    const pad = 6;
    const tw = ctx.measureText(label).width;
    const bx = x;
    const by = Math.max(0, y - 22);

    ctx.fillStyle = isMatch ? '#10b981' : '#ef4444';
    ctx.fillRect(bx, by, tw + pad * 2, 20);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, bx + pad, by + 15);
  }
}

function renderCompareResult(raw) {
  const resultEl = document.getElementById('compareResult');
  const data = normalizeCompareResponse(raw);

  lastCompareResult = data;
  syncCanvasToTargetImage();

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

  // matches는 similarity 내림차순이 아닐 수도 있으니 정렬
  const matches = Array.isArray(data.matches) ? [...data.matches] : [];
  matches.sort((a, b) => Number(b.similarity || 0) - Number(a.similarity || 0));

  const matched = Boolean(data.matched);
  const thr = Number(data.requestedSimilarityThreshold ?? 0);
  const max = Number(data.maxSimilarity ?? (matches[0]?.similarity ?? 0));

  const verdict = makeVerdict({
    matched,
    requestedSimilarityThreshold: thr,
    maxSimilarity: max,
  });

  const badge = matched ? '<span class="badge ok">MATCH</span>' : '<span class="badge no">NO MATCH</span>';

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

  // best match 1개를 target 이미지에 박스로 표시
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (matches[0]?.boundingBox) {
    drawBoundingBox(matches[0].boundingBox, `${fmt(matches[0].similarity, 2)}%`, matched);
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// ---- Compare handlers ----
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

targetInput.addEventListener('change', async () => {
  try {
    const file = targetInput.files?.[0];
    previewImage(file, targetPreview);
    targetImageBase64 = await fileToBase64(file);

    // 이미지가 로드된 이후 캔버스 동기화
    targetPreview.onload = () => {
      syncCanvasToTargetImage();
      // 리사이즈/재렌더
      if (lastCompareResult?.matches?.[0]?.boundingBox) {
        renderCompareResult(lastCompareResult);
      }
    };

    setStatus('compareStatus', '');
  } catch (e) {
    setStatus('compareStatus', e.message);
  }
});

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
function renderJsonPre(id, payload) {
  document.getElementById(id).textContent = JSON.stringify(payload, null, 2);
}

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

// 리사이즈 시 박스/캔버스 재정렬
window.addEventListener('resize', () => {
  if (!targetPreview.src) return;
  syncCanvasToTargetImage();
  if (lastCompareResult) renderCompareResult(lastCompareResult);
});

// 초기 렌더
document.getElementById('compareResult').innerHTML = '<div class="card">이미지를 선택하면 결과가 여기에 표시됩니다.</div>';
