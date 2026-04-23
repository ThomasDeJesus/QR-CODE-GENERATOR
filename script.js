const ALLOWED_EMAIL_DOMAIN = '@stadetoulousain.fr';
const QR_WIDTH = 300;

let currentContent = '';
let currentFileName = '';

function normalizeHex(value) {
    if (!value) return null;
    let v = value.trim();
    if (v[0] !== '#') v = '#' + v;
    if (/^#[0-9a-fA-F]{3}$/.test(v)) {
        v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    }
    return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : null;
}

function bindColorPair(pickerId, hexId) {
    const picker = document.getElementById(pickerId);
    const hex = document.getElementById(hexId);
    picker.addEventListener('input', () => {
        hex.value = picker.value;
        hex.classList.remove('invalid');
        if (currentContent) renderQRCode();
    });
    hex.addEventListener('input', () => {
        const normalized = normalizeHex(hex.value);
        if (normalized) {
            hex.classList.remove('invalid');
            picker.value = normalized;
            if (currentContent) renderQRCode();
        } else {
            hex.classList.add('invalid');
        }
    });
    hex.addEventListener('blur', () => {
        const normalized = normalizeHex(hex.value);
        if (normalized) {
            hex.value = normalized;
            hex.classList.remove('invalid');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const borderSize = document.getElementById('borderSize');
    const borderSizeValue = document.getElementById('borderSizeValue');
    if (borderSize && borderSizeValue) {
        borderSize.addEventListener('input', () => {
            borderSizeValue.textContent = borderSize.value;
            if (currentContent) renderQRCode();
        });
    }
    bindColorPair('darkColor', 'darkColorHex');
    bindColorPair('lightColor', 'lightColorHex');
});

function sanitizeFileName(content) {
    const base = content.substring(0, 50).replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
    return base || 'qrcode';
}

function getOrCreatePreviewCanvas() {
    const container = document.getElementById('qrCodeResult');
    let canvas = container.querySelector('canvas');
    if (!canvas) {
        container.innerHTML = '';
        canvas = document.createElement('canvas');
        canvas.setAttribute('aria-label', 'QR Code généré');
        container.appendChild(canvas);
    }
    return canvas;
}

function renderQRCode() {
    if (!currentContent) return;

    const darkHex = document.getElementById('darkColor').value;
    const lightHex = document.getElementById('lightColor').value;
    const border = parseInt(document.getElementById('borderSize').value, 10) || 0;

    const inner = document.createElement('canvas');
    new QRious({
        element: inner,
        value: currentContent,
        size: QR_WIDTH,
        level: 'M',
        padding: 0,
        foreground: darkHex,
        background: lightHex,
    });

    const canvas = getOrCreatePreviewCanvas();
    canvas.width = inner.width + border * 2;
    canvas.height = inner.height + border * 2;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = lightHex;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(inner, border, border);
}

async function generateQRCode() {
    const content = document.getElementById('qrContent').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();

    if (!content || !email) {
        alert("Veuillez remplir tous les champs.");
        return;
    }

    if (!email.endsWith(ALLOWED_EMAIL_DOMAIN)) {
        alert("Accès refusé.");
        return;
    }

    currentContent = content;
    currentFileName = sanitizeFileName(content);

    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('qrCodeResult').innerHTML = '';
    document.getElementById('downloadBtn').classList.add('hidden');

    try {
        renderQRCode();
        document.getElementById('downloadBtn').classList.remove('hidden');
        document.getElementById('resetBtn').classList.remove('hidden');
    } catch (error) {
        alert(`Échec : ${error.message}`);
    } finally {
        document.getElementById('loading').classList.add('hidden');
    }
}

function downloadQRCode() {
    const canvas = document.querySelector('#qrCodeResult canvas');
    if (!canvas) {
        alert("Générez d'abord un QR Code.");
        return;
    }
    canvas.toBlob(blob => {
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = `${currentFileName}.png`;
        downloadLink.click();
    }, 'image/png');
}

function resetForm() {
    document.getElementById('qrContent').value = '';
    document.getElementById('qrCodeResult').innerHTML = '';
    document.getElementById('downloadBtn').classList.add('hidden');
    document.getElementById('resetBtn').classList.add('hidden');
    currentContent = '';
}
