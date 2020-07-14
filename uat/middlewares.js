const { createProxyMiddleware } = require('http-proxy-middleware');
const toxy = require('toxy');

function paramsFrom(dict) {
  const params = new URLSearchParams();
  Object.entries(dict).forEach(([name, value]) => params.set(name, value));
  return params;
}

function createCompareMiddleware({ bases, comparison }) {
  function compareMiddleware(req, res) {
    const search = paramsFrom(req.query).toString();
    const imgPath = (base) => `${base}/${comparison}?${search}`;
    const theirs = imgPath(bases.theirs);
    const ours = imgPath(bases.ours);
    res.status(200).send(`
    <!doctype html>
<html charset="utf-8">
  <head>
    <meta http-equiv="Accept-CH" content="DPR, Width, Viewport-Width">
    <title>origin compare</title>
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
        <h1>${bases.theirs}</h1>
        <img src="${theirs}" title="${search}" alt="${search}">
      </div>
      <div class="ours">
        <h1>${bases.ours}</h1>
        <img src="${ours}" title="${search}" alt="${search}">
      </div>
    </main>
  </body>
</html>
    `);
  }
  return compareMiddleware;
}

function createExampleImageHandler({ filename, bases }) {
  function handleExampleImage(req, res) {
    const original = `/original/${filename}`;
    const params = paramsFrom(req.query);
    const base = req.query.base
      ? bases[req.query.base] || req.query.base
      : '/hastily';
    const resized = `${base}/${filename}?${params.toString()}`;
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
  }
  return handleExampleImage;
}

function createForgivingProxyMiddleware({ name, target }) {
  const { origin, pathname } = new URL(target);
  return createProxyMiddleware({
    target: origin,
    pathRewrite: {
      [`^/${name}`]: pathname,
    },
  });
}

function createBadConnectionMiddleware() {
  const latency = toxy.poisons.latency({ jitter: 1000 });
  const throttle = toxy.poisons.throttle({ chunk: 1024, delay: 1000 });
  const middleware = toxy()
    .outgoingPoison(latency)
    .outgoingPoison(throttle)
    .middleware();
  return middleware;
}

module.exports = {
  createCompareMiddleware,
  createExampleImageHandler,
  createForgivingProxyMiddleware,
  createBadConnectionMiddleware,
};
