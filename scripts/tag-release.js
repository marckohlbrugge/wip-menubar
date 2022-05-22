const shell = require('shelljs');
const { version } = require('../package.json');
shell.set('-e');

try {
  (async () => {
    console.log('\nTagging the release...');
    shell.exec(`git tag v${version}`);
    shell.exec(`git push origin v${version}`);
  })();
} catch (e) {
  console.log(e);
  process.exit(1);
}
