const API_URL = 'https://elastic.snaplogic.com/api/1/rest/slsched/feed/StadeToulousainProd/SI%20-%20General/00.%20Pipelines/CREATE%20Qr%20Code%20Task'; // Optionnel, mais pas avec un .env sur GitHub Pages
const BEARER_TOKEN = 'Hub0ZvaOvcT8Ztw4cTiRE7JsN1PXk4Wa';

async function generateQRCode() {
    const codenumber = document.getElementById('codenumber').value;
    const email = document.getElementById('email').value;

    if (!codenumber || !email) {
        alert("Veuillez remplir tous les champs.");
        return;
    }

    const url = `${API_URL}?codenumber=${encodeURIComponent(codenumber)}&email=${encodeURIComponent(email)}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${BEARER_TOKEN}`,
                'Accept': '*/*',
            },
        });

        if (!response.ok) {
            throw new Error(`Erreur API: ${response.status} - ${response.statusText}`);
        }

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);

        document.getElementById('qrCodeResult').innerHTML = `<img src="${imageUrl}" alt="QR Code généré" />`;
    } catch (error) {
        alert(`Échec : ${error.message}`);
    }
}
