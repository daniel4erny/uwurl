import index from "./public/index.html";
import { uploadFile, downloadFile } from "./files.ts";
import { notFoundPage } from "./pages.ts";

Bun.serve({
  port: 3000,
  routes: {
      "/": index,
      "/api/upload_file": uploadFile,
      "/download/:id": downloadFile
  },
  fetch() {
    return notFoundPage();
  },
});
