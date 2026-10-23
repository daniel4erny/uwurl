const fileInput = document.getElementById("fileInput");
const uploadButton = document.getElementById("uploadButton");
const status = document.getElementById("status");

uploadButton.addEventListener("click", upload);

async function upload() {
    const file = fileInput.files[0];
    if (!file) { return };

    uploadButton.disabled = true;
    status.textContent = "Nahrávám…";

    try {
        const res = await fetch("/api/upload_file", {
            method: "POST",
            headers: {
                "Content-Type": "application/octet-stream",
                "X-Filename": encodeURIComponent(file.name),
            },
            body: file,
        });

        if (res.status === 401) {
            status.textContent = "Nejsi přihlášený. Obnov stránku a zadej heslo.";
            return;
        }

        if (!res.ok) {
            status.textContent = `Chyba: ${await res.text()}`;
            return;
        }

        const body = await res.json();
        status.textContent = `id: ${body.id}
heslo: ${body.password}
url: ${location.origin}/download/${body.id}?pass=${body.password}`;
        fileInput.value = "";
    } catch (error) {
        status.textContent = `Chyba: ${error}`;
    } finally {
        uploadButton.disabled = false;
    }
}
