import { Database } from "bun:sqlite";
import { file } from "bun";
import type { BunRequest } from "bun";
import { mkdirSync } from "node:fs";

type FileRecord = {
    id: string;
    password: string;
    name: string;
    size: number;
    created_at: number;
    path: string;
};

mkdirSync("./data", { recursive: true }); // SQLite neumí vytvořit složku, jen soubor
mkdirSync("./uploads", { recursive: true });
const db = new Database("./data/uwurl.sqlite", { create: true });
db.run(`
CREATE TABLE IF NOT EXISTS files (
    id         TEXT PRIMARY KEY,
    password   TEXT NOT NULL,      -- hash, ne heslo
    name       TEXT NOT NULL,      -- původní jméno souboru
    size       INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    path      TEXT NOT NULL          -- path to the file on disk
)
`);

export async function uploadFile(req: Request): Promise<Response> {
    try {
        if (req.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405 });
        }

        if (req.headers.get("content-type") !== "application/octet-stream") {
            return new Response("Expected application/octet-stream", { status: 415 });
        }

        const upload = await req.blob();
        if (upload.size === 0) {
            return new Response("Missing file", { status: 400 });
        }

        const id = crypto.randomUUID();
        const name = decodeURIComponent(req.headers.get("x-filename") ?? "unnamed");
        const size = upload.size;
        const path = `./uploads/${id}`;
        await Bun.write(path, upload);

        function generateRandomHex(length = 10) {
          const buffer = new Uint8Array(length);
          crypto.getRandomValues(buffer);
          return Array.from(buffer)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        }
        const password = generateRandomHex(16);
        const createdAt = Date.now();
        const hash = await Bun.password.hash(password);
        db.run(
            "INSERT INTO files (id, password, name, size, created_at, path) VALUES (?, ?, ?, ?, ?, ?)",
            [id, hash, name, size, createdAt, path]
        );

        return Response.json({ id, password, name, size, createdAt });
    } catch (error) {
        console.error("Error uploading file:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}

export async function downloadFile(req: BunRequest<"/download/:id">): Promise<Response> {
    try {
        const method = req.method;
        if (method == "GET") {
            const id = req.params.id;
            const fileRecord = db.query<FileRecord, [string]>(
                "SELECT * FROM files WHERE id = ?",
            ).get(id);

            if (!fileRecord) {
                return new Response("File not found", { status: 404 });
            }

            return Response.json(fileRecord.name);}

        else if (method == "POST") {
            const id = req.params.id;
            const fileRecord = db.query<FileRecord, [string]>(
                "SELECT * FROM files WHERE id = ?",
            ).get(id);

            if (!fileRecord) {
                return new Response("File not found", { status: 404 });
            }


            const form = await req.formData();
            const password = form.get("password");

            if (typeof password !== "string") {
                return new Response("Missing password", { status: 400 });
            }

            const hash = await Bun.password.hash(password)

            if (hash !== fileRecord.password) {
                return new Response("Invalid password", { status: 403 });
            }

            const fileData = await Bun.file(fileRecord.path);
            return new Response(fileData, {
                headers: {
                    "Content-Type": "application/octet-stream",
                    "Content-Disposition": `attachment; filename="${fileRecord.name}"`,
                },
            });
        } else {
            return new Response("Method Not Allowed", { status: 405 });
        }
    } catch (error) {
        console.error("Error downloading file:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}
