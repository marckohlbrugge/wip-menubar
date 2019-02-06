const { net } = require('electron');
const logger = require('electron-timber');
const FormData = require('form-data');
const fs = require('fs');

let devMode = false;
let apiKey;

function setDevMode(value) {
  devMode = value;
}

function setApiKey(value) {
  apiKey = value;
}

function viewer(options = {}) {
  return new Promise((resolve, reject) => {
    const request = makeRequest();
    let body = '';

    request.on('response', response => {
      if (response.statusCode !== 200) {
        logger.error('viewer error');
        if (options.onFailure) return options.onFailure(response);
        return reject(response);
      }

      response.on('data', chunk => {
        body += chunk.toString();
      });

      response.on('end', () => {
        const json = JSON.parse(body);
        const data = {
          username: json.data.viewer.username,
          firstName: json.data.viewer.first_name,
          currentStreak: json.data.viewer.streak,
          bestStreak: json.data.viewer.best_streak,
          streaking: json.data.viewer.streaking,
          products: json.data.viewer.products,
        };
        if (options.onSuccess) return options.onSuccess(data);
        return resolve(data);
      });
    });
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
    request.end(prepareQuery(query));
  });
}
function uploadFile(presigned_url, file) {
  return new Promise((resolve, reject) => {
    const form = new FormData();

    for(let field of Object.keys(presigned_url.fields)){
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

function createTodo(todo = null, completed = true, files = [], options = {}) {
  return new Promise(async (resolve, reject) => {

    let keys = new Array();
    if(files.length > 0) {
      for (const file of files) {
        const presigned_url = await createPresignedUrl(file.file.name);
        await uploadFile(presigned_url, file);

        // TODO: check what happens when using quotes in filename
        keys.push(`{ key: "${presigned_url.fields['key']}", size: ${file.file.size}, filename: "${file.file.name}"}`);

      }
    }

    const request = makeRequest();
    let body = '';

    request.on('response', response => {
      if (response.statusCode !== 200) {
        logger.error('create todo reject:');
        logger.error(response.statusCode);
        if (options.onFailure) return options.onFailure(response);
        return reject(response);
      }

      response.on('data', chunk => {
        logger.log('chunk of data');
        body += chunk.toString();
      });

      response.on('end', () => {
        logger.log('create todo end');

        const json = JSON.parse(body);
        const data = {
          id: json.data.createTodo.id,
          completed_at: json.data.createTodo.completed_at,
        };
        logger.log(data);
        if (options.onSuccess) return options.onSuccess(data);
        return resolve(data);
      });
    });
    const attachments = keys.length > 0
      ? `, attachments: [${keys.join(', ')}]`
      : '';
    const completed_at = completed
      ? `, completed_at:"${new Date().toISOString()}"`
      : '';
    const query = `
      mutation createTodo {
        createTodo(input: { body:"${todo}"${completed_at}${attachments} }) {
          id
          body
          completed_at
        }
      }
    `;
    request.end(prepareQuery(query));
  });
}

function completeTodo(todo_id = null, files = [], options = {}) {
  return new Promise(async (resolve, reject) => {
    let keys = new Array();
    if(files.length > 0) {
      for (const file of files) {
        const presigned_url = await createPresignedUrl(file.file.name);
        await uploadFile(presigned_url, file);

        // TODO: check what happens when using quotes in filename
        keys.push(`{ key: "${presigned_url.fields['key']}", size: ${file.file.size}, filename: "${file.file.name}"}`);

      }
    }

    const request = makeRequest();
    let body = '';

    request.on('response', response => {
      if (response.statusCode !== 200) {
        if (options.onFailure) return options.onFailure(response);
        return reject(response);
      }

      response.on('data', chunk => {
        body += chunk.toString();
      });

      response.on('end', () => {
        const json = JSON.parse(body);
        const data = {
          id: json.data.completeTodo.id,
          completed_at: json.data.completeTodo.completed_at,
        };
        logger.log(data);
        if (options.onSuccess) return options.onSuccess(data);
        return resolve(data);
      });
    });

    const attachments = keys.length > 0
      ? `, attachments: [${keys.join(', ')}]`
      : '';
    const query = `
      mutation completeTodo {
        completeTodo(id: "${todo_id}"${attachments}) {
          id
          completed_at
        }
      }
    `;
    request.end(prepareQuery(query));
  });
}

function pendingTodos(filter = null, options = {}) {
  return new Promise((resolve, reject) => {
    const request = makeRequest();
    let body = '';

    request.on('response', response => {
      if (response.statusCode !== 200) {
        if (options.onFailure) return options.onFailure(response);
        return reject(response);
      }

      response.on('data', chunk => {
        body += chunk.toString();
      });

      response.on('end', () => {
        const json = JSON.parse(body);
        const data = json.data.viewer.todos;
        if (options.onSuccess) return options.onSuccess(data);
        return resolve(data);
      });
    });

    const query = `
      {
        viewer {
          todos(filter: "${filter}", completed: false, limit: 100) {
            id
            body
          }
        }
      }
    `;
    request.end(prepareQuery(query));
  });
}

function createPresignedUrl(filename, options = {}) {
  logger.log('Creating presigned URL for ' + filename);
  return new Promise((resolve, reject) => {
    const request = makeRequest();
    let body = '';

    request.on('response', response => {
      if (response.statusCode !== 200) {
        if (options.onFailure) return options.onFailure(response);
        return reject(response);
      }

      response.on('data', chunk => {
        body += chunk.toString();
      });

      response.on('end', () => {
        const json = JSON.parse(body);
        const data = {
          url: json.data.createPresignedUrl.url,
          fields: JSON.parse(json.data.createPresignedUrl.fields),
          method: json.data.createPresignedUrl.method,
          headers: JSON.parse(json.data.createPresignedUrl.headers),
        };
        if (options.onSuccess) return options.onSuccess(data);
        return resolve(data);
      });
    });

    const query = `
      mutation {
        createPresignedUrl(input:{filename:"${filename}"}) {
          url
          fields
          method
          headers
        }
      }
    `;
    request.end(prepareQuery(query));
  });
}

function getAccessToken(code) {
  logger.log('getAccessToken(' + code + ')');
  return new Promise((resolve, reject) => {
    let request_options = { method: 'POST', path: '/oauth/token' };

    if (devMode) {
      request_options.protocol = 'http:';
      request_options.hostname = 'wip.test';
      request_options.port = 80;
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
      client_id: '3225b01300130110b77dfce9bff5fd3d99807c1f77d9ba554fb3b885ee0a3c3c',
      // client_secret: '68ff04b568e93156d7009a34bd3b572b1e6796435da571067f28a78d20645f35',
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
    };
    // request.write(params.stringify());
    request.end(`client_id=3225b01300130110b77dfce9bff5fd3d99807c1f77d9ba554fb3b885ee0a3c3c&client_secret=68ff04b568e93156d7009a34bd3b572b1e6796435da571067f28a78d20645f35&code=${code}&grant_type=authorization_code&redirect_uri=urn:ietf:wg:oauth:2.0:oob`);
  });
}

function makeRequest() {
  let request_options = { method: 'POST', path: '/graphql' };

  if (devMode) {
    request_options.protocol = 'http:';
    request_options.hostname = 'wip.test';
    request_options.port = 80;
  } else {
    request_options.protocol = 'https:';
    request_options.hostname = 'wip.chat';
    request_options.port = 443;
  }

  const request = net.request(request_options);
  request.setHeader('Content-Type', 'application/json');
  request.setHeader('Accept', 'application/json');
  request.setHeader('Authorization', `bearer ${apiKey}`);

  return request;
}

function prepareQuery(query) {
  logger.log(query);
  return JSON.stringify({ query: query });
}

module.exports = {
  viewer: viewer,
  pendingTodos: pendingTodos,
  createTodo: createTodo,
  completeTodo: completeTodo,
  createPresignedUrl: createPresignedUrl,
  setApiKey: setApiKey,
  setDevMode: setDevMode,
  getAccessToken: getAccessToken,
};
