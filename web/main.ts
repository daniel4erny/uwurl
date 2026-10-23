import index from "./public/index.html";
import { uploadFile, downloadFile, checkAuth, cleanUpFiles, login } from "./files.ts";
import { middleware, notFoundPage } from "./pages.ts";

type Handler = (req: Request) => Response | Promise<Response>;
type Middleware = (handler: Handler) => Handler;

const home = () => new Response(Bun.file(index.index));

Bun.cron("0 0 * * *", async () => {
    try {
        await cleanUpFiles();
    } catch (error) {
        console.error("cleanup failed:", error);
    }
});

Bun.serve({
  port: 3000,
  routes: {
      "/": checkAuth(home),
      "/index.js": Bun.file("./public/index.js"),
      "/index.css": Bun.file("./public/index.css"),
      "/middleware": () => middleware(),
      "/login": login,
      "/api/upload_file": checkAuth(uploadFile),
      "/download/:id": checkAuth(downloadFile)
  },
  fetch() {
    return notFoundPage();
  },
});
