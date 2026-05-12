"use strict";

var http = require("http");
var fs = require("fs");
var path = require("path");

var port = Number(process.env.PORT || 3847);
var htmlPath = path.join(__dirname, "..", "public", "ai-dashboard.html");

function isDashboardPath(url) {
  if (!url) {
    return false;
  }
  var pathOnly = url.split("?")[0];
  return pathOnly === "/" || pathOnly === "/index.html";
}

http
  .createServer(function (req, res) {
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
