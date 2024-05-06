const { net } = require('electron');
const logger = require('./logger');
const { GraphQLClient } = require('graphql-request');
const store = require('./store');

let devMode = false;
let apiKey;
let clientId;

function client() {
  const endpoint = devMode
    ? 'http://wip.test:3000/graphql'
    : 'https://wip.co/graphql';

  return new GraphQLClient(endpoint, {
    headers: {
      authorization: `Bearer ${apiKey}`,
    },
  });
}

function setDevMode(value) {
  devMode = value;
}

function getDevMode() {
  return devMode;
}

function setApiKey(value) {
  apiKey = value;
}

function setClientId(value) {
  clientId = value;
}

function getOAuthURL() {
  var base = devMode ? 'http://wip.test:3000' : 'https://wip.co';

  return `${base}/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=urn:ietf:wg:oauth:2.0:oob`;
}

function viewer(options = {}) {
  return new Promise(async (resolve, reject) => {
    const query = `
      {
        viewer {
          id
          username
          first_name
          streak
          best_streak
          completed_todos_count
          streaking
          time_zone
          projects {
            id
            name
            url
            hashtag
          }
        }
      }
    `;
    try {
      const json = await client().request(query);
      const data = {
        username: json.viewer.username,
        firstName: json.viewer.first_name,
        currentStreak: json.viewer.streak,
        bestStreak: json.viewer.best_streak,
        streaking: json.viewer.streaking,
        time_zone: json.viewer.time_zone,
        projects: json.viewer.projects,
      };
      return resolve(data);
    } catch (error) {
      if (error.type == 'system' && error.code == 'ENOTFOUND') {
        return reject('No internet connection');
      } else {
        return reject(error.response.errors[0].message);
      }
    }
  });
}

function uploadFile(presigned_url, file) {
  return new Promise((resolve, reject) => {
    const request = net.request({
      method: presigned_url.method,
      url: presigned_url.url,
      headers: presigned_url.headers,
    });

    request.on('response', (response) => {
      let status = response.statusCode;
      let body = '';
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        if (![200, 204].includes(status)) {
          reject(`Invalid status code <${status}>, description: ${body}`);
        }
        resolve();
      });
    });

    request.on('error', reject);

    request.write(file.file.data);
    request.end();
  });
}

async function uploadFiles(files = []) {
  let keys = new Array();
  for (const file of files) {
    const { name, size, checksum, mime } = file.file;
    const presigned_url = await createPresignedUrl(name, size, checksum, mime);
    await uploadFile(presigned_url, file);
    keys.push({ signedId: presigned_url.signedId });
  }

  return keys;
}

async function createTodo(todo = null, files = []) {
  const mutation = `
    mutation createTodo($body: String!, $attachments: [AttachmentInput], $broadcast: Boolean) {
      createTodo(input: { body: $body, attachments: $attachments, broadcast: $broadcast }) {
        id
        body
        completed_at
      }
    }
  `;

  const keys = await uploadFiles(files);
  const variables = {
    body: todo,
    attachments: keys,
    broadcast: store.get('broadcast'),
  };
  logger.log('Executing createTodo query', variables);
  const json = await client().request(mutation, variables);
  const data = {
    id: json.createTodo.id,
    completed_at: json.createTodo.completed_at,
  };
  logger.log('createTodo response: ', json);
  return data;
}

async function createPresignedUrl(filename, byteSize, checksum, mime) {
  logger.log('Creating presigned URL for ' + filename);
  const mutation = `
    mutation createPresignedUrl($filename: String!, $byteSize: Int!, $checksum: String!, $contentType: String!) {
      createPresignedUrl(input:{ filename: $filename, byteSize: $byteSize, checksum: $checksum, contentType: $contentType }) {
        url
        signedId
        method
        headers
      }
    }
  `;
  const variables = {
    filename: filename,
    byteSize: Number(byteSize),
    checksum: checksum,
    contentType: mime,
  };

  const json = await client().request(mutation, variables);
  const data = {
    url: json.createPresignedUrl.url,
    signedId: json.createPresignedUrl.signedId,
    method: json.createPresignedUrl.method,
    headers: JSON.parse(json.createPresignedUrl.headers),
  };
  return data;
}

function getAccessToken(code) {
  logger.log('getAccessToken(' + code + ')');
  return new Promise((resolve, reject) => {
    let request_options = { method: 'POST', path: '/oauth/token' };

    if (devMode) {
      request_options.protocol = 'http:';
      request_options.hostname = 'wip.test';
      request_options.port = 3000;
    } else {
      request_options.protocol = 'https:';
      request_options.hostname = 'wip.co';
      request_options.port = 443;
    }

    const request = net.request(request_options);
    // request.setHeader('Content-Type', 'application/json');
    request.setHeader('Accept', 'application/json');
    request.setHeader('Content-Type', 'application/x-www-form-urlencoded');
    let body = '';

    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        console.warn('Rejected with status code ' + response.statusCode);
        console.warn(response);
        return reject(response);
      }

      response.on('data', (chunk) => {
        body += chunk.toString();
      });

      response.on('end', () => {
        const json = JSON.parse(body);
        return resolve(json);
      });
    });

    const params = {
      client_id: clientId,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
    };
    // request.write(params.stringify());
    request.end(
      `client_id=${clientId}&code=${code}&grant_type=authorization_code&redirect_uri=urn:ietf:wg:oauth:2.0:oob`,
    );
  });
}

module.exports = {
  viewer: viewer,
  createTodo: createTodo,
  createPresignedUrl: createPresignedUrl,
  setApiKey: setApiKey,
  setClientId: setClientId,
  setDevMode: setDevMode,
  getDevMode: getDevMode,
  getAccessToken: getAccessToken,
  getOAuthURL: getOAuthURL,
};
