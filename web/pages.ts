function escapeHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function layout(title: string, content: string): string {
    return `<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
</head>
<body>
    <main>
        ${content}
    </main>
</body>
</html>`;
}

function htmlResponse(body: string, status: number): Response {
    return new Response(body, {
        status,
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
        },
    });
}

export function notFoundPage(): Response {
    return htmlResponse(
        layout(
            "Soubor nenalezen",
            `<h1>404</h1>
            <p>Soubor neexistuje nebo už byl smazán.</p>
            <p><a href="/">Zpět na nahrání souboru</a></p>`,
        ),
        404,
    );
}

export function passwordPage(
    fileName: string,
    options: { error?: string; status?: number } = {},
): Response {
    const error = options.error
        ? `<p class="error">${escapeHtml(options.error)}</p>`
        : "";

    return htmlResponse(
        layout(
            `download ${escapeHtml(fileName)}`,
            `<h1>download</h1>
            <p class="filename">${escapeHtml(fileName)}</p>
            <form method="POST">
                <label for="password">pass</label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    autocomplete="current-password"
                    required
                    autofocus
                >
                <button type="submit">download</button>
            </form>
            ${error}`,
        ),
        options.status ?? 200,
    );
}
