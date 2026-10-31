import {
  CronEditor,
  CronError,
  describeCron,
  nextCronTimes,
  parseCron,
  validateCron,
  type CronEditorProps,
} from '../dist/esm/index.js';
const props: CronEditorProps = {
  value: '*/15 * * * *',
  onChange: (value) => console.log(value),
  timeZone: 'UTC',
};
void [CronEditor, CronError, describeCron, nextCronTimes, parseCron, validateCron, props];
