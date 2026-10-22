async function upload() {
    /*     const form = await req.formData();
        const upload = form.get("file");

        if (!(upload instanceof File)) {
            return new Response("Missing file", { status: 400 });
        }

        const id = crypto.randomUUID();
        const name = upload.name
        const size = upload.size;
        const path = `./app/uploads${id}`;
        await Bun.write(path, upload);

        const password = crypto.randomUUID();
        const createdAt = Date.now();
        const hash = await Bun.password.hash(password) */

    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];
    if (!file) { return };

    const res = await fetch("/upload", {
        method: "POST",
        headers: {
            "Content-Type": "application/octet-stream",
            "X-Filename": encodeURIComponent(file.name),
        },
        body: file,
    });

    const body = await res.json();
    document.getElementById("status").innerText(String(body))
}
