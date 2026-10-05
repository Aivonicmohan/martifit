const express = require('express');
const app = express();
app.get('/3', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end("OK\n");
});
const s = app.listen(3005, async () => {
  const r3 = await fetch('http://localhost:3005/3').then(r => r.headers.get('content-type'));
  console.log("3:", r3);
  s.close();
});
