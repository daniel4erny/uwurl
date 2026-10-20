import { Database } from "bun:sqlite";
import { file } from "bun";
import type { BunRequest } from "bun";

type FileRecord = {
    id: string;
    password: string;
    name: string;
    size: number;
    created_at: number;
    path: string;
};

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
        const form = await req.formData();
        const upload = form.get("file");

        if (!(upload instanceof File)) {
            return new Response("Missing file", { status: 400 });
        }

        const id = crypto.randomUUID();
        const name = upload.name
        const size = upload.size;
        const path = `./data/files/${id}`;
        await Bun.write(path, upload);

        const password = crypto.randomUUID();
        const createdAt = Date.now();

        db.run(
            "INSERT INTO files (id, password, name, size, created_at, path) VALUES (?, ?, ?, ?, ?, ?)",
            [id, password, name, size, createdAt, path]
        );

        return Response.json({ id, password, name, size, createdAt });
    } catch (error) {
        console.error("Error uploading file:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}

export async function downloadFile(req: BunRequest<"/:id/:name">): Promise<Response> {
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

            if (password !== fileRecord.password) {
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
