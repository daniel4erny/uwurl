// script je type="module" → funkce nejsou globální, onclick="upload()" v HTML je nevidí
document.getElementById("uploadButton").addEventListener("click", upload);

async function upload() {
    const fileInput = document.getElementById("fileInput");
    const status = document.getElementById("status");
    const file = fileInput.files[0];
    if (!file) { return };

    const res = await fetch("/api/upload_file", {
        method: "POST",
        headers: {
            "Content-Type": "application/octet-stream",
            "X-Filename": encodeURIComponent(file.name),
        },
        body: file,
    });

    if (!res.ok) {
        status.innerText = `Chyba: ${await res.text()}`;
        return;
    }

    const body = await res.json();
    status.innerText = `id: ${body.id}, heslo: ${body.password}`;
}
