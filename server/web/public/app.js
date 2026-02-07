async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json();
}

function renderResult(id, payload) {
  document.getElementById(id).textContent = JSON.stringify(payload, null, 2);
}

document.getElementById('compareForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const sourceFile = document.getElementById('sourceImage').files[0];
    const targetFile = document.getElementById('targetImage').files[0];
    const similarityThreshold = Number(document.getElementById('similarityThreshold').value || 80);

    const [sourceImageBase64, targetImageBase64] = await Promise.all([
      fileToBase64(sourceFile),
      fileToBase64(targetFile),
    ]);

    const result = await postJson('/api/compare', {
      sourceImageBase64,
      targetImageBase64,
      similarityThreshold,
    });

    renderResult('compareResult', result);
  } catch (error) {
    renderResult('compareResult', { message: error.message });
  }
});

document.getElementById('textForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const file = document.getElementById('textImage').files[0];
    const imageBase64 = await fileToBase64(file);

    const result = await postJson('/api/extract-text', { imageBase64 });
    renderResult('textResult', result);
  } catch (error) {
    renderResult('textResult', { message: error.message });
  }
});
