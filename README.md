# @lp-labs/react-cron-editor

Parser, validator, human-readable summary, bounded next-occurrence search, and a controlled React cron field using a fixed five-field numeric dialect.

## Example

```tsx
import { CronEditor, nextCronTimes, parseCron } from "@lp-labs/react-cron-editor";
import "@lp-labs/react-cron-editor/styles.css";

const schedule = parseCron("*/15 9-17 * * 1-5"); // every 15 minutes during weekday work hours
const next = nextCronTimes(schedule, { from: new Date(), timeZone: "America/New_York", count: 3 });
function ScheduleInput() { const [value, setValue] = React.useState("0 9 * * 1-5"); return <CronEditor value={value} onChange={setValue} timeZone="America/New_York" />; }
```

## React API

`CronEditorProps` is `{value: string; onChange(value: string): void; timeZone?: string; className?: string}`. `CronEditor` is controlled, with `timeZone` defaulting to `"UTC"` and class defaulting to `lp-cron-editor`. Invalid input sets `aria-invalid`, shows a role-alert error; valid input shows a summary and next UTC ISO timestamp labeled with the selected zone. A valid schedule with no match within the default search interval displays a bounded-search message.

## Helpers and types

- `CronFieldName` is `minute | hour | dayOfMonth | month | dayOfWeek`; `CronExpression` contains normalized `source` and a readonly numeric `fields` record.
- `CronError` extends `Error`; parser/search failures use this class.
- `parseCron(source: string): CronExpression` requires exactly five whitespace-separated fields: minute (0-59), hour (0-23), day-of-month (1-31), month (1-12), weekday (0-7; 0 and 7 mean Sunday). Supported field forms are `*`, one decimal integer, inclusive ascending `a-b`, comma-separated forms, and `/step` on `*`, integer-to-maximum, or range. Step is a positive integer no larger than the field width. Names, seconds/year fields, macros, `?`, wrapping ranges, and nonstandard dialects are rejected. Throws `CronError` on syntax/range errors.
- `validateCron(source: string)` returns `{valid:true, expression}` or `{valid:false, error}` and does not throw parser errors.
- `describeCron(expression: string | CronExpression): string` returns a basic readable summary; it is descriptive, not a locale-aware natural-language compiler. An invalid expression string throws `CronError`.
- `NextCronOptions` accepts `from?: Date` (default now), `timeZone?: string` (default UTC), `limitMinutes?: number` (default 527040; integer 1 through 2629440), `count?: number` (default 1; integer 1 through 100).
- `nextCronTimes(expression: string | CronExpression, options?: NextCronOptions): Date[]` returns matching absolute instants strictly after the start minute, searching minute-by-minute up to the inclusive bound. Throws `CronError` for invalid dates/zones/options or no match. Uses the host runtime `Intl` IANA time-zone database. DST gaps have no matching instant; repeated local wall-clock minutes can yield two distinct instants.

## Semantics, limits, and accessibility

The day-of-month/day-of-week fields follow cron OR semantics when both are restricted; if one is wildcard, the restricted field controls. `*` is expanded to all numeric field values, so `*/1` is semantically equivalent to wildcard. Search is bounded (up to five years) and minute-granular; it does not schedule seconds. Because weekday calculation and timezone transitions use `Intl`, results may vary with the installed runtime timezone database. `describeCron` may print expanded numeric lists. The text field is labeled and errors are announced. Scheduling systems must independently define their timezone and missed-run policies.

React is the sole runtime peer. ESM and CommonJS artifacts include declarations; CSS is optional.

## License

[MIT](./LICENSE).

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
