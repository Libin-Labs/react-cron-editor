import * as React from 'react';

export type CronFieldName = 'minute' | 'hour' | 'dayOfMonth' | 'month' | 'dayOfWeek';
export interface CronExpression {
  source: string;
  fields: Record<CronFieldName, readonly number[]>;
}
export class CronError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CronError';
  }
}
const specs: readonly { name: CronFieldName; min: number; max: number; label: string }[] = [
  { name: 'minute', min: 0, max: 59, label: 'minute' },
  { name: 'hour', min: 0, max: 23, label: 'hour' },
  { name: 'dayOfMonth', min: 1, max: 31, label: 'day of month' },
  { name: 'month', min: 1, max: 12, label: 'month' },
  { name: 'dayOfWeek', min: 0, max: 7, label: 'day of week' },
];
function parseField(token: string, spec: (typeof specs)[number]): number[] {
  const result = new Set<number>();
  for (const piece of token.split(',')) {
    const [rangePart, stepPart, ...extra] = piece.split('/');
    if (
      !rangePart ||
      extra.length ||
      (piece.includes('/') && (!stepPart || !/^\d+$/u.test(stepPart)))
    )
      throw new CronError(`Invalid ${spec.label} field: ${token}`);
    const step = stepPart === undefined ? 1 : Number(stepPart);
    if (step < 1 || step > spec.max - spec.min + 1)
      throw new CronError(`Invalid step in ${spec.label} field.`);
    let start: number;
    let end: number;
    if (rangePart === '*') {
      start = spec.min;
      end = spec.max;
    } else if (/^\d+$/u.test(rangePart)) {
      start = Number(rangePart);
      if (stepPart === undefined) end = start;
      else {
        end = spec.max;
      }
    } else {
      const match = /^(\d+)-(\d+)$/u.exec(rangePart);
      if (!match) throw new CronError(`Invalid ${spec.label} field: ${token}`);
      start = Number(match[1]);
      end = Number(match[2]);
    }
    if (start < spec.min || start > spec.max || end < spec.min || end > spec.max || start > end)
      throw new CronError(`Out-of-range ${spec.label} field: ${token}`);
    for (let value = start; value <= end; value += step)
      result.add(spec.name === 'dayOfWeek' && value === 7 ? 0 : value);
  }
  return [...result].sort((a, b) => a - b);
}
export function parseCron(source: string): CronExpression {
  const tokens = source.trim().split(/\s+/u);
  if (tokens.length !== 5)
    throw new CronError(
      'Cron expression must contain exactly five fields: minute hour day-of-month month day-of-week.',
    );
  const fields = Object.fromEntries(
    specs.map((spec, index) => [spec.name, parseField(tokens[index], spec)]),
  ) as unknown as Record<CronFieldName, readonly number[]>;
  return { source: tokens.join(' '), fields };
}
export function validateCron(
  source: string,
): { valid: true; expression: CronExpression } | { valid: false; error: string } {
  try {
    return { valid: true, expression: parseCron(source) };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid cron expression.',
    };
  }
}
export function describeCron(expression: string | CronExpression): string {
  const cron = typeof expression === 'string' ? parseCron(expression) : expression;
  const f = cron.fields;
  const all = (key: CronFieldName, low: number, high: number) => f[key].length === high - low + 1;
  const minute = all('minute', 0, 59)
    ? 'every minute'
    : `at minute${f.minute.length === 1 ? '' : 's'} ${f.minute.join(', ')}`;
  const hour = all('hour', 0, 23)
    ? 'of every hour'
    : `past hour${f.hour.length === 1 ? '' : 's'} ${f.hour.join(', ')}`;
  const date =
    all('dayOfMonth', 1, 31) && all('month', 1, 12) && all('dayOfWeek', 0, 6)
      ? 'every day'
      : `on day ${f.dayOfMonth.join(', ')} of month ${f.month.join(', ')} and weekday ${f.dayOfWeek.join(', ')}`;
  return `${minute} ${hour} ${date}`;
}
function zonedParts(date: Date, timeZone: string): number[] {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    minute: 'numeric',
    hour: 'numeric',
    day: 'numeric',
    month: 'numeric',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (name: string) => Number(parts.find((part) => part.type === name)?.value);
  const weekdays: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return [
    get('minute'),
    get('hour'),
    get('day'),
    get('month'),
    weekdays[parts.find((part) => part.type === 'weekday')?.value ?? ''],
  ];
}
function matches(cron: CronExpression, date: Date, zone: string): boolean {
  const [minute, hour, day, month, weekday] = zonedParts(date, zone);
  const f = cron.fields;
  const tokens = cron.source.split(/\s+/u);
  const domWildcard = tokens[2].split(',').some((part) => part.startsWith('*'));
  const dowWildcard = tokens[4].split(',').some((part) => part.startsWith('*'));
  const dayMatch =
    domWildcard && dowWildcard
      ? true
      : domWildcard
        ? f.dayOfWeek.includes(weekday)
        : dowWildcard
          ? f.dayOfMonth.includes(day)
          : f.dayOfMonth.includes(day) || f.dayOfWeek.includes(weekday);
  return f.minute.includes(minute) && f.hour.includes(hour) && f.month.includes(month) && dayMatch;
}
export interface NextCronOptions {
  from?: Date;
  timeZone?: string;
  limitMinutes?: number;
  count?: number;
}
export function nextCronTimes(
  expression: string | CronExpression,
  options: NextCronOptions = {},
): Date[] {
  const cron = typeof expression === 'string' ? parseCron(expression) : expression;
  const zone = options.timeZone ?? 'UTC';
  const limit = options.limitMinutes ?? 366 * 24 * 60;
  const count = options.count ?? 1;
  if (!Number.isInteger(limit) || limit < 1 || limit > 366 * 24 * 60 * 5)
    throw new CronError('limitMinutes must be an integer from 1 to 2,629,440.');
  if (!Number.isInteger(count) || count < 1 || count > 100)
    throw new CronError('count must be an integer from 1 to 100.');
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone }).format(new Date());
  } catch {
    throw new CronError(`Invalid IANA time zone: ${zone}`);
  }
  const from = options.from ?? new Date();
  if (!Number.isFinite(from.getTime())) throw new CronError('from must be a valid Date.');
  let minute = Math.floor(from.getTime() / 60_000) * 60_000 + 60_000;
  const matchesFound: Date[] = [];
  for (let checked = 0; checked < limit; checked++, minute += 60_000) {
    const candidate = new Date(minute);
    if (matches(cron, candidate, zone)) matchesFound.push(candidate);
    if (matchesFound.length === count) return matchesFound;
  }
  throw new CronError(`No matching time found within ${limit} minutes.`);
}
export interface CronEditorProps {
  value: string;
  onChange: (value: string) => void;
  timeZone?: string;
  className?: string;
}
export function CronEditor({
  value,
  onChange,
  timeZone = 'UTC',
  className,
}: CronEditorProps): React.ReactElement {
  const result = validateCron(value);
  let next = '';
  if (result.valid) {
    try {
      next = nextCronTimes(result.expression, { from: new Date(), timeZone })[0].toISOString();
    } catch {
      next = 'No occurrence found within the search limit.';
    }
  }
  return (
    <section className={className ?? 'lp-cron-editor'}>
      <label>
        Five-field cron expression
        <input
          aria-label="Cron expression"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={!result.valid}
        />
      </label>
      {result.valid ? (
        <>
          <p>{describeCron(result.expression)}</p>
          <p>
            Next occurrence ({timeZone}): <time>{next}</time>
          </p>
        </>
      ) : (
        <p role="alert">{result.error}</p>
      )}
    </section>
  );
}
