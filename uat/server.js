const path = require('path');
const http = require('http');
const fs = require('fs');
const nocache = require('nocache');
const express = require('express');
const Nginx = require('./nginx');
const {
  createCompareMiddleware,
  createExampleImageHandler,
  createForgivingProxyMiddleware,
} = require('./middlewares');

const hastily = require('../build/main');

const NGINX_PORT = 3003;
const NGINX_ORIGIN = `http://localhost:${NGINX_PORT}`;
const SERVER_PORT = 3002;

const imageDir = path.resolve(__dirname, 'images');
const files = fs.readdirSync(imageDir);

function promiseListening(app) {
  return new Promise((resolve, reject) => {
    try {
      const server = http.createServer(app);
      server.on('error', reject);
      server.listen(SERVER_PORT, '0.0.0.0', () => {
        const { address, port } = server.address();
        resolve(`http://${address}:${port}`);
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function server() {
  const app = express();
  app.use(nocache());

  function addProxyOption(name, target) {
    app.use(
      `/${name}`,
      hastily.imageopto(),
      createForgivingProxyMiddleware({ name, target })
    );
  }

  const nodeStatic = express.static(imageDir, {
    cacheControl: false,
    etag: false,
    lastModified: false,
  });
  app.use('/original', nodeStatic);

  app.use('/hastily', hastily.imageopto(), nodeStatic);

  addProxyOption('nginx', NGINX_ORIGIN);

  if (process.env.TEST_FROM_PROXY) {
    const [name, target] = process.env.TEST_FROM_PROXY.split(',');
    addProxyOption(name, target);
  }

  files.forEach((filename) => {
    app.get(
      `/${filename}.html`,
      createExampleImageHandler({
        filename,
        bases: {
          nginxproxy: NGINX_ORIGIN + '/hastily',
        },
      })
    );
  });

  app.get(
    '/fastly-compare',
    createCompareMiddleware({
      bases: {
        ours: '/hastily',
        theirs: 'https://www.fastly.io',
      },
      comparison: 'image.jpg',
    })
  );

  const demoURLBase = await promiseListening(app);
  Nginx.start({ listen: NGINX_PORT, proxy: demoURLBase, imageDir });
  files.forEach((filename) => {
    console.log(new URL(`/${filename}.html`, demoURLBase).href);
  });
}

module.exports = () =>
  server().catch((e) => {
    console.error(e);
    Nginx.stop();
    process.exit();
  });
