const { net } = require('electron');

let devMode = false;
let apiKey;

function setDevMode(value) {
  devMode = value;
}

function setApiKey(value) {
  apiKey = value;
}

function viewer(options = {}) {
  console.log("API KEY");
  console.log(apiKey);
  return new Promise((resolve, reject) => {
    const request = makeRequest();
    let body = '';

    request.on('response', response => {
      if (response.statusCode !== 200) {
        console.log("viewer error");
        if (options.onFailure) return options.onFailure(response);
        return reject(response);
      }

      response.on('data', chunk => {
        body += chunk.toString();
      });

      response.on('end', () => {
        const json = JSON.parse(body);
        const data = {
          completedCount: 123, // json.data.viewer.completed_todos_count,
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

function createTodo(todo = null, completed = true, options = {}) {
  return new Promise((resolve, reject) => {
    const request = makeRequest();
    let body = '';

    request.on('response', response => {
      if (response.statusCode !== 200) {
        console.log('create todo reject:');
        console.log(response.statusCode);
        if (options.onFailure) return options.onFailure(response);
        return reject(response);
      }

      response.on('data', chunk => {
        console.log('chunk of data');
        body += chunk.toString();
      });

      response.on('end', () => {
        console.log('create todo end');

        const json = JSON.parse(body);
        const data = {
          id: json.data.createTodo.id,
          completed_at: json.data.createTodo.completed_at,
        };
        console.log(data);
        if (options.onSuccess) return options.onSuccess(data);
        return resolve(data);
      });
    });

    const completed_at = completed
      ? ` completed_at:"${new Date().toISOString()}"`
      : '';
    const query = `
      mutation createTodo {
        createTodo(input: { body:"${todo}"${completed_at} }) {
          id
          body
          completed_at
        }
      }
    `;
    request.end(prepareQuery(query));
  });
}

function completeTodo(todo_id = null, options = {}) {
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
          id: json.data.completeTodo.id,
          completed_at: json.data.completeTodo.completed_at,
        };
        console.log(data);
        if (options.onSuccess) return options.onSuccess(data);
        return resolve(data);
      });
    });

    const query = `
      mutation completeTodo {
        completeTodo(id: "${todo_id}") {
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
  return JSON.stringify({ query: query });
}

module.exports = {
  viewer: viewer,
  pendingTodos: pendingTodos,
  createTodo: createTodo,
  completeTodo: completeTodo,
  setApiKey: setApiKey,
  setDevMode: setDevMode,
};
