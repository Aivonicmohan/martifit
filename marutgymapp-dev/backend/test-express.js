const express = require('express');
const app = express();
app.get('/1', (req, res) => {
  res.type('text/plain').send("OK\n");
});
app.get('/2', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(Buffer.from("OK\n"));
});
const s = app.listen(3005, async () => {
  const r1 = await fetch('http://localhost:3005/1').then(r => r.headers.get('content-type'));
  const r2 = await fetch('http://localhost:3005/2').then(r => r.headers.get('content-type'));
  console.log("1:", r1);
  console.log("2:", r2);
  s.close();
});
