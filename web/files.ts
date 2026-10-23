import { Database } from "bun:sqlite";
import type { BunRequest } from "bun";
import { mkdirSync } from "node:fs";
import { createHmac, timingSafeEqual } from "node:crypto";
import { middleware, notFoundPage, passwordPage } from "./pages.ts";
import { env } from "bun";

if (typeof env.PASS != "string") {
    console.error("gg pico")
    throw new Error("ENV PASS NOT DEFINED");
}

const PASS = await Bun.password.hash(env.PASS)

const AUTH_COOKIE = "password";
const AUTH_MAX_AGE = 60 * 60 * 24 * 30; // 30 dní
// stabilní token odvozený z PASS, takže přežije restart aplikace
const AUTH_TOKEN = createHmac("sha256", env.PASS)
    .update("uwurl-auth-v1")
    .digest("hex");

type FileRecord = {
    id: string;
    password: string;
    name: string;
    size: number;
    created_at: number;
    path: string;
};

type Handler = (req: BunRequest<any>) => Response | Promise<Response>;

function isAuthorized(req: BunRequest): boolean {
    const token = req.cookies.get(AUTH_COOKIE);
    if (token === null) return false;
    const given = Buffer.from(token);
    const expected = Buffer.from(AUTH_TOKEN);
    return given.length === expected.length && timingSafeEqual(given, expected);
}

export const checkAuth = (h: Handler) => async (req: BunRequest): Promise<Response> => {
    if (isAuthorized(req)) {
        return h(req)
    }
    // API volání nesmí dostat HTML přihlášky
    if (new URL(req.url).pathname.startsWith("/api/")) {
        return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    return middleware()
}

export async function login(req: BunRequest): Promise<Response> {
    if (req.method !== "POST") {
        return new Response(null, { status: 303, headers: { Location: "/" } });
    }

    try {
        const form = await req.formData();
        const password = form.get("password");

        if (typeof password !== "string" || password.length === 0) {
            return middleware({ status: 400, error: "Zadej heslo." });
        }

        if (!(await Bun.password.verify(password, PASS))) {
            return middleware({ status: 403, error: "Špatné heslo, zkus to znovu." });
        }

        return new Response(null, {
            status: 303,
            headers: {
                Location: "/",
                "Set-Cookie": `${AUTH_COOKIE}=${AUTH_TOKEN}; Path=/; Max-Age=${AUTH_MAX_AGE}; HttpOnly; SameSite=Lax`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("Error logging in:", error);
        return middleware({ status: 500, error: "Přihlášení se nepovedlo, zkus to znovu." });
    }
}

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
                return notFoundPage();
            }

            return passwordPage(fileRecord.name);
        }

        else if (method == "POST") {
            const id = req.params.id;
            const fileRecord = db.query<FileRecord, [string]>(
                "SELECT * FROM files WHERE id = ?",
            ).get(id);

            if (!fileRecord) {
                return notFoundPage();
            }

            const form = await req.formData();
            const password = form.get("password");

            if (typeof password !== "string" || password.length === 0) {
                return passwordPage(fileRecord.name, {
                    status: 400,
                    error: "Zadej heslo.",
                });
            }

            const passwordOk = await Bun.password.verify(password, fileRecord.password);

            if (!passwordOk) {
                return passwordPage(fileRecord.name, {
                    status: 403,
                    error: "Špatné heslo, zkus to znovu.",
                });
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

export async function cleanUpFiles() {
    const files = db.query<FileRecord, [string]>(
        "SELECT * FROM files",
    ).all("UWU");

    for (const file of files) {
        const filePath = file.path;
        try {
            if (expired(file.created_at)) {
                await Bun.file(filePath).delete();
                db.run("DELETE FROM files WHERE id = ?", [file.id]);
                console.log(`Deleted expired file: ${filePath}`);
            }
        } catch (error) {
            console.error(`Failed to delete expired file: ${filePath}`, error);
        }
    }
}

function expired(createdAt: number): boolean {
    const now = Date.now();
    const expirationTime = 24 * 60 * 60 * 1000;
    return now - createdAt > expirationTime;
}
