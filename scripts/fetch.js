const follow = require('follow-redirects');
const fs     = require('fs');
const rimraf = require('rimraf');
const tar    = require('tar');

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

const kernelVersion = '21.1';
const kernelFolderName = `ShenOSKernel-${kernelVersion}`;
const kernelArchiveName = `${kernelFolderName}.tar.gz`;
const kernelArchiveUrlBase = 'https://github.com/Shen-Language/shen-sources/releases/download';
const kernelArchiveUrl = `${kernelArchiveUrlBase}/shen-${kernelVersion}/${kernelArchiveName}`;
const targetFolderName = 'kernel';

const fetch = async () => {
  if (fs.existsSync(targetFolderName)) {
    rimraf.sync(targetFolderName);
  }

  const data = await request(kernelArchiveUrl);
  fs.writeFileSync(kernelArchiveName, data);
  await tar.extract({ file: kernelArchiveName, unlink: true });
  fs.renameSync(kernelFolderName, targetFolderName);
  fs.unlinkSync(kernelArchiveName);
};

fetch().then(console.log, console.error);
