import index from "./public/index.html";

Bun.serve({
  port: 3000,
  routes: {
    "/": index,
  },
  fetch() {
    return new Response("Not Found", { status: 404 });
  },
});
