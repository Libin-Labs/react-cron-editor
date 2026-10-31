import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
const dom = new JSDOM("<!doctype html><div id='root'></div>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const api = await import('../dist/esm/index.js');
const cjs = createRequire(import.meta.url)('../dist/cjs/index.js');
test('ESM and CommonJS expose the same runtime API', () =>
  assert.deepEqual(
    Object.keys(cjs)
      .filter((key) => key !== '__esModule')
      .sort(),
    Object.keys(api).sort(),
  ));
test('parses five fields and searches bounded, zoned upcoming times', () => {
  assert.deepEqual(api.parseCron('*/15 9-10 * * 1-5').fields.minute, [0, 15, 30, 45]);
  assert.equal(api.validateCron('* * *').valid, false);
  assert.throws(() => api.parseCron('61 * * * *'), api.CronError);
  const next = api.nextCronTimes('0 9 * * *', {
    from: new Date('2024-01-01T08:00:00Z'),
    timeZone: 'UTC',
  });
  assert.equal(next[0].toISOString(), '2024-01-01T09:00:00.000Z');
  const allDays = api.nextCronTimes('0 0 1-31 * 1', {
    from: new Date('2024-01-01T00:00:00Z'),
    timeZone: 'UTC',
  });
  assert.equal(allDays[0].toISOString(), '2024-01-02T00:00:00.000Z');
  assert.throws(() => api.nextCronTimes('* * * * *', { timeZone: 'Not/AZone' }), /Invalid IANA/u);
  assert.throws(
    () =>
      api.nextCronTimes('0 0 * * *', { from: new Date('2024-01-01T00:00:00Z'), limitMinutes: 10 }),
    /No matching time/u,
  );
  assert.match(api.describeCron('0 9 * * *'), /hour/u);
});
test('renders invalid-expression feedback', async () => {
  const root = createRoot(document.getElementById('root'));
  let changed;
  await React.act(async () =>
    root.render(
      React.createElement(api.CronEditor, {
        value: 'nope',
        onChange: (value) => {
          changed = value;
        },
      }),
    ),
  );
  assert.ok(document.querySelector('[aria-invalid="true"]'));
  assert.ok(document.querySelector('[role="alert"]'));
  const input = document.querySelector('input');
  const setValue = Object.getOwnPropertyDescriptor(
    dom.window.HTMLInputElement.prototype,
    'value',
  ).set;
  await React.act(async () => {
    setValue.call(input, '0 9 * * *');
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  assert.equal(changed, '0 9 * * *');
  await React.act(async () => root.unmount());
});
