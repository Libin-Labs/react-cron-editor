import api = require('../dist/cjs/index.js');
const props: api.CronEditorProps = {
  value: '0 9 * * 1-5',
  onChange: (value) => console.log(value),
};
void [
  api.CronEditor,
  api.CronError,
  api.describeCron,
  api.nextCronTimes,
  api.parseCron,
  api.validateCron,
  props,
];
