let qrCodeBlob; // Pour stocker l'image binaire d'origine (API)
let customizedBlob; // Pour stocker l'image personnalisée (couleurs + bords)
let currentCodeNumber = ''; // Pour savoir comment nommer le fichier

function normalizeHex(value) {
    if (!value) return null;
    let v = value.trim();
    if (v[0] !== '#') v = '#' + v;
    // Accepte #rgb ou #rrggbb
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
        if (qrCodeBlob) applyCustomization();
    });
    hex.addEventListener('input', () => {
        const normalized = normalizeHex(hex.value);
        if (normalized) {
            hex.classList.remove('invalid');
            picker.value = normalized;
            if (qrCodeBlob) applyCustomization();
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
            if (qrCodeBlob) applyCustomization();
        });
    }
    bindColorPair('darkColor', 'darkColorHex');
    bindColorPair('lightColor', 'lightColorHex');
});

function hexToRgb(hex) {
    const v = hex.replace('#', '');
    return {
        r: parseInt(v.substring(0, 2), 16),
        g: parseInt(v.substring(2, 4), 16),
        b: parseInt(v.substring(4, 6), 16),
    };
}

function detectContentBounds(data, width, height) {
    const isDark = (x, y) => {
        const i = (y * width + x) * 4;
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        return lum < 128;
    };
    let top = 0, bottom = height - 1, left = 0, right = width - 1;
    topLoop: for (; top < height; top++) {
        for (let x = 0; x < width; x++) if (isDark(x, top)) break topLoop;
    }
    bottomLoop: for (; bottom >= top; bottom--) {
        for (let x = 0; x < width; x++) if (isDark(x, bottom)) break bottomLoop;
    }
    leftLoop: for (; left < width; left++) {
        for (let y = top; y <= bottom; y++) if (isDark(left, y)) break leftLoop;
    }
    rightLoop: for (; right >= left; right--) {
        for (let y = top; y <= bottom; y++) if (isDark(right, y)) break rightLoop;
    }
    if (top > bottom || left > right) return { x: 0, y: 0, w: width, h: height };
    return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}

async function applyCustomization() {
    if (!qrCodeBlob) return;

    const darkHex = document.getElementById('darkColor').value;
    const lightHex = document.getElementById('lightColor').value;
    const border = parseInt(document.getElementById('borderSize').value, 10) || 0;
    const dark = hexToRgb(darkHex);
    const light = hexToRgb(lightHex);

    const imgUrl = URL.createObjectURL(qrCodeBlob);
    const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = imgUrl;
    });

    // Canvas source : décodage brut
    const src = document.createElement('canvas');
    src.width = img.width;
    src.height = img.height;
    const sctx = src.getContext('2d');
    sctx.drawImage(img, 0, 0);

    // Détecte la vraie zone du QR (ignore la quiet zone ajoutée par l'API)
    const bounds = detectContentBounds(
        sctx.getImageData(0, 0, src.width, src.height).data,
        src.width,
        src.height,
    );

    // Canvas recadré pour ne contenir que les modules utiles
    const inner = document.createElement('canvas');
    inner.width = bounds.w;
    inner.height = bounds.h;
    const ictx = inner.getContext('2d');
    ictx.drawImage(src, bounds.x, bounds.y, bounds.w, bounds.h, 0, 0, bounds.w, bounds.h);

    const data = ictx.getImageData(0, 0, inner.width, inner.height);
    const px = data.data;
    for (let i = 0; i < px.length; i += 4) {
        // Luminance -> seuil pour distinguer carrés/fond
        const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
        const isDark = lum < 128;
        px[i] = isDark ? dark.r : light.r;
        px[i + 1] = isDark ? dark.g : light.g;
        px[i + 2] = isDark ? dark.b : light.b;
        px[i + 3] = 255;
    }
    ictx.putImageData(data, 0, 0);

    // Canvas final avec bordure
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = inner.width + border * 2;
    finalCanvas.height = inner.height + border * 2;
    const fctx = finalCanvas.getContext('2d');
    fctx.fillStyle = lightHex;
    fctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    fctx.drawImage(inner, border, border);

    URL.revokeObjectURL(imgUrl);

    customizedBlob = await new Promise(res => finalCanvas.toBlob(res, 'image/png'));
    const previewUrl = URL.createObjectURL(customizedBlob);
    document.getElementById('qrCodeResult').innerHTML = `<img src="${previewUrl}" alt="QR Code généré" />`;
}

async function generateQRCode() {
    const codenumber = document.getElementById('codenumber').value;
    const email = document.getElementById('email').value;

    if (!codenumber || !email) {
        alert("Veuillez remplir tous les champs.");
        return;
    }

    currentCodeNumber = codenumber; // Pour le nom du fichier à la fin

    // Affiche le spinner de chargement
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('qrCodeResult').innerHTML = '';
    document.getElementById('downloadBtn').classList.add('hidden');

    const url = `${CONFIG.API_URL}?codenumber=${encodeURIComponent(codenumber)}&email=${encodeURIComponent(email)}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${CONFIG.BEARER_TOKEN}`,
                'Accept': '*/*',
            },
        });

        if (!response.ok) {
            throw new Error(`Erreur API: ${response.status} - ${response.statusText}`);
        }

        qrCodeBlob = await response.blob();
        await applyCustomization();

        document.getElementById('downloadBtn').classList.remove('hidden');
        document.getElementById('resetBtn').classList.remove('hidden');


    } catch (error) {
        alert(`Échec : ${error.message}`);
    } finally {
        // Cache le spinner
        document.getElementById('loading').classList.add('hidden');
    }
}

function downloadQRCode() {
    const blob = customizedBlob || qrCodeBlob;
    if (!blob) {
        alert("Générez d'abord un QR Code.");
        return;
    }

    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `${currentCodeNumber}.png`;
    downloadLink.click();
}

function resetForm() {
    document.getElementById('codenumber').value = '';
    document.getElementById('qrCodeResult').innerHTML = '';
    document.getElementById('downloadBtn').classList.add('hidden');
    document.getElementById('resetBtn').classList.add('hidden');
    qrCodeBlob = null;
    customizedBlob = null;
}