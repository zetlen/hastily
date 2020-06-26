const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const tmpDir = require('os').tmpdir();
const confPath = path.resolve(tmpDir, 'nginx-hastily-test.conf');

const getConf = ({ listen, proxy, imageDir }) => `master_process off;
error_log stderr warn;
pid ${path.join(tmpDir, 'nginx-hastily-test.pid')};
daemon off;

http {
  server {
    access_log off;
    listen ${listen};
    root ${imageDir};
    location / {
      autoindex on;
      add_header Cache-Control 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';
      if_modified_since off;
      expires off;
      etag off;
    }
    location /hastily/ {
      proxy_pass ${proxy};
    }
  }
}

events {

}
`;

const Nginx = {
  running: false,
  start({ listen, proxy, imageDir }) {
    if (Nginx.running) {
      if (listen !== Nginx.port) {
        throw new Error(
          `Nginx already running at port ${Nginx.port}, not gonna start another one at port ${listen}`
        );
      }
      if (proxy !== Nginx.proxy) {
        throw new Error(
          `Nginx already running and proxying to ${Nginx.proxy}, not gonna start another one proxying ${proxy}`
        );
      }
      if (imageDir !== Nginx.imageDir) {
        throw new Error(
          `Nginx already running and statically serving ${Nginx.imageDir}, not gonna serve ${imageDir}`
        );
      }
      return;
    }

    const confText = getConf({ listen, proxy, imageDir });
    fs.writeFileSync(confPath, confText, 'utf8');

    Object.assign(Nginx, {
      listen,
      proxy,
      imageDir,
      running: true,
      proc: spawn('nginx', ['-c', confPath], {
        stdio: 'inherit',
      }),
    });
  },
  async stop() {
    return new Promise((res) => {
      if (Nginx.running && Nginx.proc) {
        Nginx.proc.on('close', res);
        Nginx.proc.kill();
      } else {
        res();
      }
    });
  },
};

module.exports = Nginx;
