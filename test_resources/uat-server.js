const path = require('path');
const http = require('http');
const fs = require('fs');
const nocache = require('nocache');
const express = require('express');

const hastily = require('../');

const imageDir = path.resolve(__dirname, 'images');
const files = fs.readdirSync(imageDir);

function paramsFrom(dict) {
  const params = new URLSearchParams();
  Object.entries(dict).forEach(([name, value]) => params.set(name, value));
  return params;
}

function serve(middleware) {
  return new Promise((resolve, reject) => {
    try {
      const app = express();
      app.use(nocache());
      app.use(middleware);
      const server = http.createServer(app);
      server.on('error', reject);
      server.listen(process.env.PORT || 3002, '0.0.0.0', () => {
        const { address, port } = server.address();
        resolve(`http://${address}:${port}`);
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function main() {
  const demo = express();
  const static = express.static(imageDir, {
    cacheControl: false,
    etag: false,
    lastModified: false
  });
  demo.use('/original', static);
  demo.use('/hastily', hastily.imageopto(), static);
  demo.get('/fastly-compare', (req, res) => {
    const search = paramsFrom(req.query).toString();
    const theirs = `https://www.fastly.io/image.jpg?${search}`;
    const ours = `/hastily/image.jpg?${search}`;
    res.status(200).send(`
    <!doctype html>
<html charset="utf-8">
  <head>
    <meta http-equiv="Accept-CH" content="DPR, Width, Viewport-Width">
    <title>fastly/hastily compare</title>
    <style>
    body {
      font-size: 16px;
      font-family: Tahoma, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #fff;
    }
    main {
      min-height: 100vh;
      display: flex;
      flex-direction: row nowrap;
    }
    div {
      flex: 1;
      margin: 0 auto;
    }
    .theirs {
      background-color: #DBE9F4;
    }
    .ours {
      background-color: #6e443a;
    }
    h1 {
      font-size: 1rem;
      margin: 0.3em 0 0.6em;
      font-weight: normal;
      text-align: center;
    }
    .theirs h1 {
      color: rgba(0,0,0,0.6);
    }
    .ours h1 {
      color: rgba(255,255,255,0.6)
    }
    img {
      display: block;
      margin: 0 auto 1rem;
      box-shadow: 0 0 8px rgba(0,0,0,0.4);
    }
    </style>
  </head>
  <body>
    <main>
      <div class="theirs">
        <h1>fastly.io</h1>
        <img src="${theirs}" title="${search}" alt="${search}">
      </div>
      <div class="ours">
        <h1>hastily</h1>
        <img src="${ours}" title="${search}" alt="${search}">
      </div>
    </main>
  </body>
</html>
    `);
  });
  files.forEach(filename => {
    demo.get(`/${filename}.html`, (req, res) => {
      const original = `/original/${filename}`;
      const params = paramsFrom(req.query);
      const resized = `/hastily/${filename}?${params.toString()}`;
      res.status(200).send(
        `

<html>
  <head>
    <meta http-equiv="Accept-CH" content="DPR, Width, Viewport-Width">
    <title>hastily demo</title>
    <style>
      body {
        font-size: 16px;
        margin: 0;
        padding: 0;
        background-color: #${req.query.bg || 'ffeebb'};
      }
      figure {
        border: 1px solid black;
        padding: 2rem;
        margin: 1rem;
      }
    </style>
  </head>
  <body>
      <figure>
        <img src="${resized}">
        <figcaption>Resized: ${resized}</figcaption>
      </figure>
      <details>
        <summary>Original ${filename}</summary>
        <img src="${original}">
      </details>
  </body>
</html>
 `.trim()
      );
    });
  });
  const demoURLBase = await serve(demo);
  files.forEach(filename => {
    console.log(new URL(`/${filename}.html`, demoURLBase).href);
  });
}

main();
