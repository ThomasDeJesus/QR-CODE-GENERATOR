let qrCodeBlob; // Pour stocker l'image binaire
let currentCodeNumber = ''; // Pour savoir comment nommer le fichier

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
        const imageUrl = URL.createObjectURL(qrCodeBlob);

        document.getElementById('qrCodeResult').innerHTML = `<img src="${imageUrl}" alt="QR Code généré" />`;
        document.getElementById('downloadBtn').classList.remove('hidden');

    } catch (error) {
        alert(`Échec : ${error.message}`);
    } finally {
        // Cache le spinner
        document.getElementById('loading').classList.add('hidden');
    }
}

function downloadQRCode() {
    if (!qrCodeBlob) {
        alert("Générez d'abord un QR Code.");
        return;
    }

    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(qrCodeBlob);
    downloadLink.download = `${currentCodeNumber}.png`;
    downloadLink.click();
}

function resetForm() {
    document.getElementById('codenumber').value = '';
    document.getElementById('qrCodeResult').innerHTML = '';
    document.getElementById('downloadBtn').classList.add('hidden');
    document.getElementById('resetBtn').classList.add('hidden');
}