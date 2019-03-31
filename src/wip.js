const { net } = require('electron');
const logger = require('electron-timber');
const FormData = require('form-data');
const fs = require('fs');
const { GraphQLClient } = require('graphql-request');

let devMode = false;
let apiKey;
let clientId;

function client() {
  const endpoint = devMode
    ? 'http://wip.test:5000/graphql'
    : 'https://wip.chat/graphql';

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
          products {
            name
            url
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
        products: json.viewer.products,
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
    const form = new FormData();

    for (let field of Object.keys(presigned_url.fields)) {
      form.append(field, presigned_url.fields[field]);
    }

    form.append('file', fs.createReadStream(file.file.path));

    form.submit(presigned_url.url, function(error, response) {
      response.resume();

      if (error) reject(error);
      if (response.statusCode != 204) {
        reject('Invalid status code <' + response.statusCode + '>');
      }
      resolve();
    });
  });
}

function createTodo(todo = null, completed = true, files = []) {
  return new Promise(async (resolve, reject) => {
    let keys = new Array();

    if (files.length > 0) {
      for (const file of files) {
        const presigned_url = await createPresignedUrl(file.file.name);
        await uploadFile(presigned_url, file);
        keys.push({
          key: presigned_url.fields['key'],
          size: file.file.size,
          filename: file.file.name,
        });
      }
    }

    const mutation = `
      mutation createTodo($body: String!, $completed_at: DateTime, $attachments: [AttachmentInput]) {
        createTodo(input: { body: $body, completed_at: $completed_at, attachments: $attachments }) {
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
    };
    const json = await client().request(mutation, variables);
    const data = {
      id: json.createTodo.id,
      completed_at: json.createTodo.completed_at,
    };
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
          key: presigned_url.fields['key'],
          size: file.file.size,
          filename: file.file.name,
        });
      }
    }

    const mutation = `
      mutation completeTodo($id: ID!, $attachments: [AttachmentInput]) {
        completeTodo(id: $id, attachments: $attachments) {
          id
          completed_at
        }
      }
    `;
    const variables = {
      id: todo_id,
      attachments: keys,
    };
    const json = await client().request(mutation, variables);
    const data = {
      id: json.completeTodo.id,
      completed_at: json.completeTodo.completed_at,
    };
    return resolve(data);
  });
}

function pendingTodos(filter = null, options = {}) {
  return new Promise(async (resolve, reject) => {
    const query = `
      query ($filter: String) {
        viewer {
          todos(filter: $filter, completed: false, limit: 100) {
            id
            body
          }
        }
      }
    `;
    const variables = {
      filter: filter,
    };
    const json = await client().request(query, variables);
    const data = json.viewer.todos;
    return resolve(data);
  });
}

function createPresignedUrl(filename) {
  logger.log('Creating presigned URL for ' + filename);
  return new Promise(async (resolve, reject) => {
    const mutation = `
      mutation createPresignedUrl($filename: String!) {
        createPresignedUrl(input:{ filename: $filename }) {
          url
          fields
          method
          headers
        }
      }
    `;
    const variables = {
      filename: filename,
    };
    const json = await client().request(mutation, variables);
    const data = {
      url: json.createPresignedUrl.url,
      fields: JSON.parse(json.createPresignedUrl.fields),
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
      request_options.hostname = 'wip.chat';
      request_options.port = 443;
    }

    const request = net.request(request_options);
    // request.setHeader('Content-Type', 'application/json');
    request.setHeader('Accept', 'application/json');
    request.setHeader('Content-Type', 'application/x-www-form-urlencoded');
    let body = '';

    request.on('response', response => {
      if (response.statusCode !== 200) {
        console.warn('Rejected with status code ' + response.statusCode);
        console.warn(response);
        return reject(response);
      }

      response.on('data', chunk => {
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
};
