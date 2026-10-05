const express = require('express');
const app = express();
app.get('/chunked', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end("OK\n");
});
const s = app.listen(3005, async () => {
  const resp = await fetch('http://localhost:3005/chunked');
  console.log("Headers:");
  for (let [k,v] of resp.headers) {
    console.log(k, ":", v);
  }
  s.close();
});
