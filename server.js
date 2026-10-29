"use strict";

const http = require("http");
const next = require("next");

const port = Number.parseInt(process.env.PORT || "3000", 10);
const hostname = process.env.HOST || "0.0.0.0";
const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  http.createServer((req, res) => handle(req, res)).listen(port, hostname, () => {
    console.log(`Sugar Platform Diagnostic listening on ${hostname}:${port}`);
  });
}).catch((error) => {
  console.error("Failed to start Sugar Platform Diagnostic", error);
  process.exit(1);
});
