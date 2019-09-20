const follow                        = require('follow-redirects');
const fs                            = require('fs');
const rimraf                        = require('rimraf');
const tar                           = require('tar');
const { kernelVersion, kernelPath } = require('./config');

const request = url => new Promise((resolve, reject) => {
  follow[url.startsWith('https:') ? 'https' : 'http'].get(url, r => {
    if (r.statusCode < 200 || r.statusCode > 299) {
      reject(new Error('Failed to load page, status code: ' + r.statusCode));
    }

    const data = [];
    r.on('data', x => data.push(x));
    r.on('end', () => resolve(Buffer.concat(data)));
  }).on('error', e => reject(e));
});

const kernelFolderName = `ShenOSKernel-${kernelVersion}`;
const kernelArchiveName = `${kernelFolderName}.tar.gz`;
const kernelArchiveUrlBase = 'https://github.com/Shen-Language/shen-sources/releases/download';
const kernelArchiveUrl = `${kernelArchiveUrlBase}/shen-${kernelVersion}/${kernelArchiveName}`;

const fetch = async () => {
  if (fs.existsSync(kernelPath)) {
    rimraf.sync(kernelPath);
  }

  const data = await request(kernelArchiveUrl);
  fs.writeFileSync(kernelArchiveName, data);
  await tar.extract({ file: kernelArchiveName, unlink: true });
  fs.renameSync(kernelFolderName, kernelPath);
  fs.unlinkSync(kernelArchiveName);
};

fetch().then(console.log, console.error);
