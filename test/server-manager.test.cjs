const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const { createDomFixture } = require('./dom-fixture.cjs');

function load(fetch, environment = {}) {
  const context = vm.createContext({
    AbortController, AbortSignal, DOMException, TextDecoder,
    setTimeout, clearTimeout, fetch,
    console: { log() {}, warn() {}, error() {} },
    document: { addEventListener() {} },
    ...environment
  });
  vm.runInContext(readFileSync(join(__dirname, '../app.js'), 'utf8'), context);
  return vm.runInContext('({ ServerManager, LanChatApp, ChatManager, UIController })', context);
}
const encode = text => new TextEncoder().encode(text);
function response(chunks, onCancel = () => {}) {
  return new Response(new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
    cancel: onCancel
  }));
}
async function bounded(promise, milliseconds = 500) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Cancellation did not settle')), milliseconds);
    })]);
  } finally { clearTimeout(timer); }
}

function domApp(fetch) {
  const dom = createDomFixture();
  const { ServerManager, LanChatApp, ChatManager, UIController } = load(fetch, dom);
  const app = Object.create(LanChatApp.prototype);
  app.serverManager = new ServerManager(); app.chatManager = new ChatManager();
  app.currentModel = 'example'; app.currentProfile = null; app.isGenerating = false;
  app.uiController = new UIController(app);
  app.uiController.elements = dom.elements;
  const errors = [];
  app.uiController.showError = error => errors.push(error);
  return { app, elements: dom.elements, errors };
}

test('preserves JSON and UTF8 characters split across every network byte', async () => {
  const wire = '{"message":{"content":"caf\u00e9\ud83d\ude42"}}\r\n{"message":{"content":" next"},"done":true}\n';
  const bytes = encode(wire);
  const { ServerManager } = load(async () => response(Array.from(bytes, byte => Uint8Array.of(byte))));
  const output = [];
  await new ServerManager().sendChatMessage('example', [], null, text => output.push(text));
  assert.equal(output.join(''), 'caf\u00e9\ud83d\ude42 next');
});

test('flushes a split final NDJSON record without a trailing newline', async () => {
  const bytes = encode('{"message":{"content":"final"}}');
  const { ServerManager } = load(async () => response([bytes.slice(0, 12), bytes.slice(12)]));
  const output = [];
  await new ServerManager().sendChatMessage('example', [], null, text => output.push(text));
  assert.deepEqual(output, ['final']);
});

test('handles multiple records and cancels the reader after the done record', async () => {
  let cancelled = 0;
  const body = new ReadableStream({
    start(controller) { controller.enqueue(encode('\n{"message":{"content":"first"}}\n{"done":true}\n{"message":{"content":"ignored"}}\n')); },
    cancel() { cancelled++; }
  });
  const { ServerManager } = load(async () => new Response(body));
  const output = [];
  await new ServerManager().sendChatMessage('example', [], null, text => output.push(text));
  assert.deepEqual(output, ['first']);
  assert.equal(cancelled, 1);
});

test('caller stop cancels the fetch before headers and remains AbortError', async () => {
  let signal;
  const { ServerManager } = load((_, options) => new Promise((resolve, reject) => {
    signal = options.signal;
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }));
  const manager = new ServerManager();
  const original = manager.fetchWithTimeout.bind(manager);
  manager.fetchWithTimeout = (url, options) => original(url, options, 100);
  const pending = manager.sendChatMessage('example', [], null, () => {});
  manager.abortCurrentRequest();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(signal.aborted, true);
  assert.equal(manager.abortController, null);
});

test('caller stop also aborts an in-flight response body after headers', async () => {
  let bodyController, signal, notify;
  const received = new Promise(resolve => { notify = resolve; });
  const { ServerManager } = load(async (_, options) => {
    signal = options.signal;
    const body = new ReadableStream({ start(controller) {
      bodyController = controller;
      controller.enqueue(encode('{"message":{"content":"partial"}}\n'));
    } });
    signal.addEventListener('abort', () => bodyController.error(signal.reason), { once: true });
    return new Response(body);
  });
  const manager = new ServerManager();
  const output = [];
  const pending = manager.sendChatMessage('example', [], null, text => { output.push(text); notify(); });
  try {
    await bounded(received);
    manager.abortCurrentRequest();
    await assert.rejects(bounded(pending), { name: 'AbortError' });
    assert.deepEqual(output, ['partial']);
    assert.equal(signal.aborted, true);
  } finally {
    bodyController?.error(new DOMException('Test cleanup', 'AbortError'));
    await pending.catch(() => {});
  }
});

test('stop prevents later records already buffered in the same network chunk', async () => {
  const { ServerManager } = load(async () => response([encode('{"message":{"content":"first"}}\n{"message":{"content":"late"},"done":true}\n')]));
  const manager = new ServerManager();
  const output = [];
  const pending = manager.sendChatMessage('example', [], null, text => {
    output.push(text); manager.abortCurrentRequest();
  });
  await assert.rejects(pending, { name: 'AbortError' });
  assert.deepEqual(output, ['first']);
});

test('timeout is distinct from intentional caller cancellation', async () => {
  const { ServerManager } = load((_, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
  }));
  await assert.rejects(new ServerManager().fetchWithTimeout('http://example.invalid', {}, 5), /Request timeout/);
});

test('an already cancelled caller does not make a fetch', async () => {
  let calls = 0;
  const { ServerManager } = load(async () => { calls++; return new Response('{}'); });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(new ServerManager().fetchWithTimeout('http://example.invalid', { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(calls, 0);
});

test('UI stop retains the partial answer without an error toast or removal', async () => {
  const { ServerManager, LanChatApp, ChatManager } = load(async () => response([encode('{"message":{"content":"partial"}}\n{"message":{"content":"late"},"done":true}\n')]));
  const app = Object.create(LanChatApp.prototype);
  app.serverManager = new ServerManager(); app.chatManager = new ChatManager();
  app.currentModel = 'example'; app.currentProfile = null; app.isGenerating = false;
  const errors = []; let removals = 0;
  app.uiController = {
    setGenerationState() {}, addMessage() { return {}; },
    updateMessageContent() { app.stopGeneration(); },
    showError(error) { errors.push(error); }, removeLastMessage() { removals++; }
  };
  await app.sendMessage('hello');
  assert.equal(app.chatManager.getMessages().at(-1).content, 'partial');
  assert.deepEqual(errors, []); assert.equal(removals, 0);
  assert.equal(app.isGenerating, false);
});


test('obsolete generation cleanup cannot reset a restarted conversation', async () => {
  const { LanChatApp, ChatManager } = load(async () => { throw new Error('No network expected'); });
  const app = Object.create(LanChatApp.prototype);
  const pending = [];
  app.serverManager = {
    sendChatMessage(model, messages, profile, onChunk) {
      return new Promise((resolve, reject) => pending.push({ resolve, reject, onChunk }));
    },
    abortCurrentRequest() {}
  };
  app.chatManager = new ChatManager(); app.currentModel = 'example';
  app.currentProfile = null; app.isGenerating = false;
  const states = [], errors = []; let removals = 0;
  app.uiController = {
    setGenerationState(value) { states.push(value); }, addMessage() { return {}; },
    updateMessageContent() {}, showError(error) { errors.push(error); },
    removeLastMessage() { removals++; }, removeMessage() { removals++; }
  };
  const first = app.sendMessage('first');
  app.stopGeneration();
  const second = app.sendMessage('second');
  pending[0].onChunk('obsolete');
  pending[0].reject(new DOMException('Stopped', 'AbortError'));
  await first;
  assert.equal(app.isGenerating, true);
  assert.equal(states.at(-1), true);
  assert.equal(app.chatManager.getMessages().filter(message => message.role === 'assistant').length, 1);
  assert.equal(app.chatManager.getMessages().at(-1).content, '');
  assert.deepEqual(errors, []); assert.equal(removals, 1);
  pending[1].onChunk('current'); pending[1].resolve(); await second;
  assert.equal(app.chatManager.getMessages().at(-1).content, 'current');
  assert.equal(app.isGenerating, false);
});

test('reports malformed complete JSON instead of silently dropping a record', async () => {
  const { ServerManager } = load(async () => response([encode('not-json\n')]));
  await assert.rejects(new ServerManager().sendChatMessage('example', [], null, () => {}), /Invalid JSON record/);
});

test('UI Stop before response headers synchronously removes its empty loading bubble', async () => {
  let signal;
  const { app, elements, errors } = domApp((_, options) => new Promise((resolve, reject) => {
    signal = options.signal;
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }));
  const pending = app.sendMessage('hello');
  try {
    assert.ok(elements.chatMessages.querySelector('.message-loading'));
    app.stopGeneration();
    // Check the DOM immediately, before the aborted promise settles.
    assert.equal(elements.chatMessages.querySelector('.message-loading'), null);
    assert.equal(elements.chatMessages.querySelector('.assistant'), null);
    assert.equal(app.chatManager.getMessages().length, 1);
    assert.equal(signal.aborted, true);
    assert.equal(elements.stopGenerationBtn.classList.contains('hidden'), true);
    await bounded(pending);
    assert.deepEqual(errors, []);
  } finally { app.stopGeneration(); await pending; }
});

test('UI Stop after headers but before content removes only its empty placeholder', async () => {
  let body, controller;
  const { app, elements, errors } = domApp(async (_, options) => {
    body = new ReadableStream({ start(value) { controller = value; } });
    options.signal.addEventListener('abort', () => controller.error(options.signal.reason), { once: true });
    return new Response(body);
  });
  const pending = app.sendMessage('hello');
  try {
    await bounded((async () => {
      while (!body?.locked) await new Promise(resolve => setImmediate(resolve));
    })());
    assert.ok(elements.chatMessages.querySelector('.message-loading'));
    app.stopGeneration();
    assert.equal(elements.chatMessages.querySelector('.message-loading'), null);
    assert.equal(elements.chatMessages.querySelector('.assistant'), null);
    assert.equal(elements.chatMessages.querySelectorAll('.message').length, 1);
    await bounded(pending);
    assert.deepEqual(errors, []);
  } finally { app.stopGeneration(); await pending; }
});

test('immediate restart keeps its own loading bubble when the stopped request settles late', async () => {
  const requests = [];
  const { app, elements, errors } = domApp((_, options) => new Promise((resolve, reject) => {
    requests.push({ resolve, reject, signal: options.signal });
    // Delay transport rejection deliberately to exercise obsolete cleanup.
  }));
  const first = app.sendMessage('first');
  let second;
  try {
    const oldPlaceholder = elements.chatMessages.querySelector('.assistant');
    app.stopGeneration();
    assert.equal(oldPlaceholder.parentElement, null);
    assert.equal(requests[0].signal.aborted, true);
    second = app.sendMessage('second');
    const currentPlaceholder = elements.chatMessages.querySelector('.assistant');
    assert.notEqual(currentPlaceholder, oldPlaceholder);
    assert.ok(currentPlaceholder.querySelector('.message-loading'));
    requests[0].reject(requests[0].signal.reason);
    await bounded(first);
    assert.equal(currentPlaceholder.parentElement, elements.chatMessages);
    assert.ok(currentPlaceholder.querySelector('.message-loading'));
    assert.equal(app.isGenerating, true);
    assert.equal(elements.stopGenerationBtn.classList.contains('hidden'), false);
    requests[1].resolve(response([encode('{"message":{"content":"current"},"done":true}\n')]));
    await bounded(second);
    assert.equal(currentPlaceholder.querySelector('.message-loading'), null);
    assert.equal(currentPlaceholder.querySelector('.message-text').innerHTML, 'current');
    assert.equal(app.chatManager.getMessages().at(-1).content, 'current');
    assert.equal(app.chatManager.getMessages().length, 3);
    assert.deepEqual(errors, []);
  } finally {
    app.stopGeneration();
    for (const request of requests) request.reject(new DOMException('Test cleanup', 'AbortError'));
    await Promise.all([first, second]);
  }
});

test('UI Stop preserves a rendered partial answer and removes no message', async () => {
  const { app, elements, errors } = domApp(async () => response([
    encode('{"message":{"content":"partial"}}\n{"message":{"content":"late"},"done":true}\n')
  ]));
  const render = app.uiController.updateMessageContent.bind(app.uiController);
  app.uiController.updateMessageContent = (element, content) => {
    render(element, content);
    app.stopGeneration();
  };
  await app.sendMessage('hello');
  const answer = elements.chatMessages.querySelector('.assistant');
  assert.ok(answer);
  assert.equal(answer.querySelector('.message-loading'), null);
  assert.equal(answer.querySelector('.message-text').innerHTML, 'partial');
  assert.equal(elements.chatMessages.querySelectorAll('.message').length, 2);
  assert.equal(app.chatManager.getMessages().at(-1).content, 'partial');
  assert.deepEqual(errors, []);
});
