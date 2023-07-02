const { net } = require('electron');
const logger = require('./logger');
const FormData = require('form-data');
const fs = require('fs');
const { GraphQLClient } = require('graphql-request');
const store = require('./store');

let devMode = false;
let apiKey;
let clientId;

function client() {
  const endpoint = devMode
    ? 'http://wip.test:5000/graphql'
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
  var base = devMode ? 'http://wip.test:5000' : 'https://wip.co';

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
      headers: presigned_url.headers
    });
    
    request.on('response', (response) => {
      let status = response.statusCode;
      let body = '';
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        if (![200, 204].includes(status)) {
          reject(`Invalid status code <${status}>, descruption: ${body}`);
        }
        resolve();
      });
    });

    request.on('error', reject);

    request.write(file.file.data);
    request.end();
  });
}

function createTodo(todo = null, completed = true, files = []) {
  return new Promise(async (resolve, reject) => {
    let keys = new Array();

    if (files.length > 0) {
      for (const file of files) {
        const { name, size, checksum, mime} = file.file;
        const presigned_url = await createPresignedUrl(name, size, checksum, mime);
        logger.log("Presigned URL: ", presigned_url);
        await uploadFile(presigned_url, file);
        keys.push({ key: presigned_url.key });
      }
    }

    const mutation = `
      mutation createTodo($body: String!, $completed_at: DateTime, $attachments: [AttachmentInput], $broadcast: Boolean) {
        createTodo(input: { body: $body, completed_at: $completed_at, attachments: $attachments, broadcast: $broadcast }) {
          id
          body
          completed_at
        }
      }
    `;
    const variables = {
      body: todo,
      completed_at: completed ? new Date().toISOString() : null,
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
    return resolve(data);
  });
}

function completeTodo(todo_id = null, files = [], options = {}) {
  return new Promise(async (resolve, reject) => {
    let keys = new Array();
    if (files.length > 0) {
      for (const file of files) {
        const presigned_url = await createPresignedUrl(file.file.name);
        await uploadFile(presigned_url, file);
        keys.push({
          key: presigned_url.key,
          size: file.file.size,
          filename: file.file.name,
        });
      }
    }

    const mutation = `
      mutation completeTodo($id: ID!, $attachments: [AttachmentInput], $broadcast: Boolean) {
        completeTodo(id: $id, attachments: $attachments, broadcast: $broadcast) {
          id
          completed_at
        }
      }
    `;
    const variables = {
      id: todo_id,
      attachments: keys,
      broadcast: store.get('broadcast'),
    };
    logger.log('Executing completeTodo query', variables);
    const json = await client().request(mutation, variables);
    const data = {
      id: json.completeTodo.id,
      completed_at: json.completeTodo.completed_at,
    };
    logger.log('completeTodo response: ', json);
    return resolve(data);
  });
}

function pendingTodos(filter = null, options = {}) {
  return new Promise(async (resolve, reject) => {
    const query = `
      query ($filter: String) {
        viewer {
          todos(filter: $filter, completed: false, limit: 100, order:"created_at:desc") {
            id
            body
          }
        }
      }
    `;
    const variables = {
      filter: filter.trim(),
    };
    const json = await client().request(query, variables);
    const data = json.viewer.todos;
    return resolve(data);
  });
}

function createPresignedUrl(filename, byteSize, checksum, mime) {
  logger.log('Creating presigned URL for ' + filename);
  return new Promise(async (resolve, reject) => {
    const mutation = `
      mutation createPresignedUrl($filename: String!, $byteSize: Int!, $checksum: String!, $contentType: String!) {
        createPresignedUrl(input:{ filename: $filename, byteSize: $byteSize, checksum: $checksum, contentType: $contentType }) {
          url
          key
          method
          headers
        }
      }
    `;
    const variables = {
      filename: filename,
      byteSize: Number(byteSize),
      checksum: checksum,
      contentType: mime
    };

    const json = await client().request(mutation, variables);
    const data = {
      url: json.createPresignedUrl.url,
      key: json.createPresignedUrl.key,
      method: json.createPresignedUrl.method,
      headers: JSON.parse(json.createPresignedUrl.headers),
    };
    return resolve(data);
  });
}

function getAccessToken(code) {
  logger.log('getAccessToken(' + code + ')');
  return new Promise((resolve, reject) => {
    let request_options = { method: 'POST', path: '/oauth/token' };

    if (devMode) {
      request_options.protocol = 'http:';
      request_options.hostname = 'wip.test';
      request_options.port = 5000;
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
  pendingTodos: pendingTodos,
  createTodo: createTodo,
  completeTodo: completeTodo,
  createPresignedUrl: createPresignedUrl,
  setApiKey: setApiKey,
  setClientId: setClientId,
  setDevMode: setDevMode,
  getDevMode: getDevMode,
  getAccessToken: getAccessToken,
  getOAuthURL: getOAuthURL,
};
