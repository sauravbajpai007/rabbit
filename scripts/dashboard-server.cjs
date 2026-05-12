"use strict";

var http = require("http");
var fs = require("fs");
var path = require("path");

var port = Number(process.env.PORT || 3847);
var htmlPath = path.join(__dirname, "..", "public", "ai-dashboard.html");
var pkgPath = path.join(__dirname, "..", "package.json");

function readPackageMeta() {
  try {
    var raw = fs.readFileSync(pkgPath, "utf8");
    var j = JSON.parse(raw);
    return { name: j.name || "", version: j.version || "", description: j.description || "" };
  } catch (e) {
    return { name: "", version: "", description: "" };
  }
}

var cachedPkg = readPackageMeta();

function pathOnly(url) {
  if (!url) {
    return "";
  }
  return url.split("?")[0] || "";
}

function isDashboardPath(url) {
  var p = pathOnly(url);
  return p === "/" || p === "/index.html";
}

function isApiStatus(url) {
  return pathOnly(url) === "/api/status";
}

http
  .createServer(function (req, res) {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Method not allowed");
      return;
    }

    if (isApiStatus(req.url)) {
      var mem = process.memoryUsage();
      var payload = JSON.stringify({
        ok: true,
        serverTime: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        node: process.version,
        platform: process.platform,
        pid: process.pid,
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        rssMb: Math.round(mem.rss / 1024 / 1024),
        appName: cachedPkg.name,
        appVersion: cachedPkg.version,
        appDescription: cachedPkg.description,
      });
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(req.method === "HEAD" ? "" : payload);
      return;
    }

    if (!isDashboardPath(req.url)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    fs.readFile(htmlPath, "utf8", function (err, html) {
      if (err) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Could not load dashboard HTML.");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    });
  })
  .listen(port, "127.0.0.1", function () {
    console.log("AI dashboard: http://127.0.0.1:" + port + "/");
  });
