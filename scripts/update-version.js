const shell = require('shelljs');
const { inc } = require('semver');
const versiony = require('versiony');
const { Octokit } = require('@octokit/rest');
shell.set('-e');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const currentBranch = process.env.GITHUB_REF_NAME;

console.log('Branch: ', currentBranch);

const getLatestRelease = async () => {
  const { data: releases } = await octokit.repos.listReleases({
    owner: 'marckohlbrugge',
    repo: 'wip-menubar',
  });
  const latestRelease = releases.find(
    (release) => !release.draft && !release.prerelease,
  );
  return latestRelease.name;
};

try {
  (async () => {
    const version = await getLatestRelease();
    let newVersion;
    switch (currentBranch) {
      case 'master': {
        newVersion = inc(version, 'minor');
        break;
      }
      case 'hotfix': {
        newVersion = inc(version, 'patch');
        break;
      }
    }

    if (!newVersion) {
      console.log('Could not get new version');
      process.exit(1);
    }

    versiony.version(newVersion).to('./package.json');

    shell.exec(`git add package.json`);
    shell.exec(`git commit -m 'Bump: ${newVersion}'`);
  })();
} catch (e) {
  console.log(e);
  process.exit(1);
}
