# 🪵 LogVault

Warning! The application is under the development. It is not recommended to use in the production.

## Description

LogVault is a library, intended to use in projects where you are required to collect, store and structure the logs, produced by your nodejs process. It uses Winston under the hood to collect and store logs with predefined and configurable setup.

## Features

- capture console outputs of your app process
- collect processes names, timestamps, environment variables, host ip address automatically
- collect and store logs in different destinations: text files (with rotation), mongo, graylog
- send alarms on specific events to Telegram chat or group

## Installation

```cmd
npm install log-vault
```
or
```cmd
yarn add log-vault
```

## Usage

### Log levels
By the default, max level of logs is set up to "info". All of the levels below will be supressed. You may define maxLevel in declaration of LogLevel class instance or set it up differently for each of the transports.
Supported levels:
- error
- warn
- info
- http
- verbose
- debug
- silly

### Console transport

```ts
import { LogVault } from 'log-vault';

const logger = new LogVault();

logger.log("Hey, I'm a log entry!");
logger.warn("It's a warning");
logger.error("Whoops!");
```

Output:
> <terminal>01 Feb 2024 17:31:15 (+03:00) <info>info</info> Hey, I'm a log entry!
01 Feb 2024 17:31:15 (+03:00) <warn>warn</warn> It's a warning
01 Feb 2024 17:31:15 (+03:00) <error>error</error> Whoops!</terminal>


Uncaught exceptions and promise rejections will also get to the log stream:
```ts
import { LogVault } from 'log-vault';

const logger = new LogVault();

throw new Error("An error appear");
```

Output:

><terminal>01 Feb 2024 17:45:03 (+03:00) <error>error</error> Error: An error appear
    at Object.<anonymous> (/home/code/log-vault/index.ts:5:7)
    at Module._compile (node:internal/modules/cjs/loader:1256:14)
    at Module.m._compile (/home/code/log-vault/node_modules/ts-node/src/index.ts:1618:23)
    at Module._extensions..js (node:internal/modules/cjs/loader:1310:10)
    at Object.require.extensions.<computed> [as .ts] (/home/code/log-vault/node_modules/ts-node/<br />src/index.ts:1621:12)
    at Module.load (node:internal/modules/cjs/loader:1119:32)
    at Function.Module._load (node:internal/modules/cjs/loader:960:12)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:86:12)
    at phase4 (/home/code/log-vault/node_modules/ts-node/src/bin.ts:649:14)
    at bootstrap (/home/code/log-vault/node_modules/ts-node/src/bin.ts:95:10)
</terminal>

### Native Console capturing
You may use the option to rewrite the native JS console methods: log, info, warn and error:

```ts
import { LogVault } from 'log-vault';

new LogVault().captureConsole();

console.log('Something...');
```
Output:
> <terminal>01 Feb 2024 17:31:15 (+03:00) <info>info</info> Something...</terminal><br/>

### Files transport

Usage:
```ts
import { LogVault } from 'log-vault';

const logger = new LogVault().withFiles();
```

By the default, LogVault will record log files into the "log" folder in the project root directory in json format with timestamp. You may configure placement of the log directory and other log options (see Configuration section). 

### Mongo transport
```ts
import { LogVault } from 'log-vault';

const logger = new LogVault().withMongo({
  db: "mongodb+srv://usr:pwd@cluster0.some.mongodb.net/?retryWrites=true&w=majority"
});
```

### Loki transport
Use Loki to export your logs into Grafana.
```ts
import { LogVault } from 'log-vault';

const logger = new LogVault().withLoki({
  host: 'http://localhost:3100'
});
```

### Labels
All transports except console support labels to extend your log messages with the additional information.
Labels that are added automatically by the default:
- environment - Your NODE_ENV env variable
- project - project root directory name (basepath of PWD env var)
- process - npm_package_name env variable (usually equal to "name" value in your project's package.json file).

You may extend the labels information using LogVault logWithDetails method:
```ts
import { LogVault } from 'log-vault';

const logger = new LogVault()

logger.logWithDetails({
  message: 'The user has kicked the door down',
  labels: {
    user: 'Chuck Norris'
  }
})
``` 
environment, project and process labels will be added automatically, no need to define it manually.


## Notifications
In some cases, we should be notified with the events occur in the system. You may set up LogVault Notificator and notification transport to be receive the specific log messages with the defined alarm channels. A Redis v^7 instance running on the machine or distant host is required for this feature.

Sending all logs from the process to the notificator:
```ts
const logger = new LogVault().withNotifications({
  name: "my-app-queue" // Unique name for BullMQ queue
});
```
Redis host is considered to run on localhost port 6379 by the default. This may be configured.

Setting up a Notificator instance. You ought to run it in different nodejs process:
```ts
const notificator = new Notificator({
  queueName: "my-app-queue" // must be the same with your queue name
}).add(
  new TelegramNotificationChannel({
    token: process.env.TG_BOT_TOKEN,
    chatId: YOUR_CHAT_ID,
    patterns: [
      {
        level: 'error'
      }
    ]
  })
).run();
```

You may add patterns to match the required log records. If any of the patterns is matched, the log record will be sent to the defiuned channel. 

Supported pattern options:
- level: any of the supported levels
- labels: object containing plain key-value pairs
- message: string or RegExp to match

Currently, only Telegram notification channel is supported. The messages will be sent to a single chat with 5 seconds time gap.

## Notes on usage with microservices or distributed app
- If you use files transport, provide a full path to your logs folder if you want to avoid storing the logs in each app directory
- Use a separate Node process or microservice to serve Notificator instance
- Configure Notificator BullMQ worker to use several threads to increase the productivity
- Use the same queue name for the Notificator across the involved processes

## Configuration reference

### LogVault constructor options
| field | desc | type | default value |
|----------|---------|----------| ---------|
| maxLevel | a LogVault level | Level | Level.info |
| project  | project name - to use instead of dirname of your app | string | basename(process.env.PWD) |
| noConsole | disable console transport - logs will be supressed from the output | boolean | false |
| inspectOptions | Node util.inspect default options to use for some transports logs messages | [node:util InspectOptions](https://nodejs.org/api/util.html#utilinspectobject-options) | { compact: false, maxArrayLength: 5, maxStringLength: 512, depth: 3 } |

### withFiles LogVault class method options 
[DailyRotateFileTransportOptions](https://github.com/winstonjs/winston-daily-rotate-file?tab=readme-ov-file#options) 

Defaults:
- dirname: "logs" folder in process app root dir
- maxSize: "1m" - rotate file on 1 Mb size
- maxFiles: "30d" - log files older than month will be deleted 
- datePattern: "YYYY-MM-DD"
- format - timestamp + json with spacing

### withMongo LogVault class method options 
[MongoDBConnectionOptions](https://github.com/winstonjs/winston-mongodb?tab=readme-ov-file#usage)

Defaults:
- format: default LogVault util inspect format
- metaKey: "labels"

### withLoki LogVault class method options
[LokiTransportOptions](https://github.com/JaniAnttonen/winston-loki?tab=readme-ov-file#options)

Defaults:
- host: params?.host || "http://127.0.0.1:3100"
- format: default LogVault util inspect format
- batching: false
- gracefulShutdown: true

### withNotifications LogVault class method options
[Winston Transport.TransportStreamOptions](https://github.com/winstonjs/winston-transport/blob/master/index.d.ts) &&
| field | desc | type | default value |
|----------|---------|----------| ---------|
| name | BullMQ Queue id | string | "log-vault" |
| queueOptions | BullMQ Queue options | [QueueOptions](https://github.com/taskforcesh/bullmq/blob/5cecea1f1625e23eeb070329bdad4ab4ac670b80/src/interfaces/queue-options.ts#L39) | { connection: { host: "localhost", port: 6379 } } |
| jobOptions | BullMQ Redis Job options | [RedisJobOptions](https://github.com/taskforcesh/bullmq/blob/5cecea1f1625e23eeb070329bdad4ab4ac670b80/src/types/job-options.ts#L18) | { removeOnComplete: true, removeOnFail: { age: 48 * 3600} } |
| inspectOptions | Node util.inspect options to use for some transports logs messages | [node:util InspectOptions](https://nodejs.org/api/util.html#utilinspectobject-options) | { compact: false, maxArrayLength: 5, maxStringLength: 512, depth: 3 } |

### Notificator constructor options
| field | desc | type | default value |
|----------|---------|----------| ---------|
| queueName | BullMQ Queue id | string | "log-vault" |
| workerOpts | BullMQ Worker options | [WorkerOptions](https://github.com/taskforcesh/bullmq/blob/5cecea1f1625e23eeb070329bdad4ab4ac670b80/src/interfaces/worker-options.ts#L16) | { connection: { host: "localhost", port: 6379 }, autorun: false } |

### TelegramNotificationChannel constructor options
| field | desc | type | default value |
|----------|---------|----------| ---------|
| patterns | Match patterns for log entry | {[key: string]: string | RegExp}[] | none (required) |
| token | Telegram bot secret token | string | none (required) |
| chatId | Telegram chat id | number | none (required) |
| template | [MustacheJS](https://github.com/janl/mustache.js) template | string | See below |
| workerOptions | BullMQ Worker options for sending messages to chat | [WorkerOptions](https://github.com/taskforcesh/bullmq/blob/5cecea1f1625e23eeb070329bdad4ab4ac670b80/src/interfaces/worker-options.ts#L16) | { limiter: { max: 1, duration: 5000 } } |

#### Default template for Telegram messages:
```ts
const basicTemplate = `{{emojiLevel}} *{{level}} log message*

{{#timestamp}}
⏱ _{{timestamp}}_
{{/timestamp}}
{{#labels.project}}*project*: {{labels.project}}{{/labels.project}}{{#labels.environment}}
*environment*: {{labels.environment}}{{/labels.environment}}{{#labels.process}}
*process*: {{labels.process}}{{/labels.process}}{{#labels.method}}
*method*: {{labels.method}}{{/labels.method}}{{#labels.user}}
*user*: {{labels.user}}{{/labels.user}}{{#shrinked}}
>The message is shrinked as it's over {{shrinked}} characters length\\.
>Please, consider a more accurate handler for this log entry in your code\\.
{{/shrinked}}

\`\`\`json
{{{message}}}
\`\`\``;
```

Alarm Telegram message with default template example:

<screenshot>![Screenshot](https://raw.githubusercontent.com/dm112-tadbox/log-vault/master/doc/images/Screenshot_20240201_224352_Telegram.png)</screenshot>

<style>
  error {
    color: red;
  }
  warn {
    color: orange;
  }
  info {
    color: green;
  }
  http {
    color: blue
  }
  verbose {
    color: cyan
  }
  debug {
    color: magenta
  }
  silly {
    color: gray
  }

  error,
  warn,
  info,
  http,
  verbose,
  debug,
  silly {
    font-weight: bold;
    font-size: 1.11em;
  }

  terminal {
    font-family: Monospace;
    white-space: break-spaces!important;
  }

  screenshot {
    display: block;
    max-width: 320px;
  }

</style>