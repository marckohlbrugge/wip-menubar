const fs = require('fs');
const path = require('path');
const { notarize } = require('electron-notarize');
const pRetry = require('p-retry');

module.exports = async function (params) {
  const { electronPlatformName, appOutDir } = params;
  const { SKIP_SIGN } = process.env;

  // Only notarize the app on Mac OS only.
  if (electronPlatformName !== 'darwin' || SKIP_SIGN === 'true') {
    return;
  }

  console.log('afterSign hook triggered');

  // Same appId in electron-builder.
  let appId = 'chat.wip.menubar';

  let appPath = path.join(
    appOutDir,
    `${params.packager.appInfo.productFilename}.app`,
  );

  if (!fs.existsSync(appPath)) {
    throw new Error(`Cannot find application at: ${appPath}`);
  }

  console.log(`Notarizing ${appId} found at ${appPath}`);

  const notarizeConfig = {
    tool: "notarytool",
    appBundleId: appId,
    appPath: appPath,
    appleApiKey: `${process.env.API_KEY_ID}`,
    appleApiKeyId: process.env.API_KEY_ID,
    appleApiIssuer: process.env.APPLE_ISSUER_ID,
  };

  await pRetry(
    (attempt) => {
      console.log('Notarization attempt: ', attempt);
      return notarize(notarizeConfig);
    },
    {
      retries: 5,
      onFailedAttempt: (error) => {
        console.log(
          `Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`,
        );
      },
    },
  );

  console.log(`Done notarizing ${appId}`);
};
