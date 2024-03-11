# 🪵 LogVault

A generator of Winston logger instance with pre-defined and configurable transports and formats.

Extra functionality:
- capture console logging methods of your app process
- collect processes names, timestamps, environment name automatically
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
Default levels:
- error
- warn
- info
- http
- verbose
- debug
- silly

### Extra data
Default LogVault formatters extract all of the additional data passed with log to "extra" object, which is placed differently for each of the transports.

### Metadata
Flat key-value pairs may be used as labels for each of the log entry. There are three keys, passing by the default:
- environment - NODE_ENV env variable of the process
- project - project root directory name (basepath of PWD env var)
- process - npm_package_name env variable (usually equal to "name" value in your project's package.json file).

You may extend the labels information using LogOptions constructor:

```ts
import { LogVault, LogOptions } from 'log-vault';

const { logger } = new LogVault()

logger.info(
  "A log record",
  new LogOptions({ meta: { myCustomKey: "value" } })
);
``` 
environment, project and process labels will be added automatically, no need to define it manually.

### Masking sensitive data
Avoid exposing sensitive data by object keys. The default fields are being masked: "password", "token", "otp" and "secret".
You may provide the configuration to the LogVault constructor:
```ts
import { LogVault, LogOptions } from 'log-vault';

const { logger } = new LogVault({
  maskOptions: {
    maskLabel: "***",
    fields: [ "secret-field-key" ]
  }
});
```

### Truncating nested data
Limit the nested level of the information to keep you log messages light and simple. There is a configuration that is applied by the default, but you may override this:
```ts
import { LogVault, LogOptions } from 'log-vault';

const { logger } = new LogVault({
  truncateOptions: {
    depth: 2,
    stringLength: 1024,
    arrayLength: 5,
    replaceWith: "...(Truncated)"
  }
});
```

### Console transport

```ts
import { LogVault } from 'log-vault';

const { logger } = new LogVault().withConsole();

logger.log({ level: "info", message: "Hey, I'm a log entry!" });
logger.warn("It's a warning");
logger.error("Whoops!");
```

Output:

![output](https://github.com/dm112-tadbox/log-vault/blob/f154fb4c0140cac9437a45afc53ae8ef0bb499c2/doc/console_transport_output.png?raw=true)

Uncaught exceptions and promise rejections are captured to the defined transports by the default:

```ts
import { LogVault } from 'log-vault';

new LogVault().withConsole();

throw new Error("An error appear");
```

Output:

![output](https://github.com/dm112-tadbox/log-vault/blob/f154fb4c0140cac9437a45afc53ae8ef0bb499c2/doc/console_transport_error.png?raw=true)

### Native Console capturing
You may use an option to rewrite the native JS console methods: log, info, warn and error:

```ts
import { LogVault } from 'log-vault';

new LogVault().withConsole().captureConsole();

console.log('Something...');
```

Output:

![output](https://github.com/dm112-tadbox/log-vault/blob/f154fb4c0140cac9437a45afc53ae8ef0bb499c2/doc/console_capture.png?raw=true)

### Files transport

Usage:
```ts
import { LogVault } from 'log-vault';

const { logger } = new LogVault().withFiles();
```

By the default, LogVault will record log files into the "log" folder in the project root directory in json format with timestamp. You may configure placement of the log directory and other log options (see Configuration section).

### Mongo transport
```ts
import { LogVault } from 'log-vault';

const { logger } = new LogVault().withMongo({
  db: "mongodb+srv://usr:pwd@cluster0.some.mongodb.net/?retryWrites=true&w=majority"
});
```

### Loki transport
Use Loki to export your logs into Grafana.

```ts
import { LogVault } from 'log-vault';

const { logger } = new LogVault().withLoki();
```

Please, take into account that due to Loki nature, it is not recommended to have dynamic labels. By the default, only the process name and Node environment data is passed directly to the Loki labels. All of the remaining metadata will be placed into the "meta" object of the log message.

Example of log entry displayed with the default Grafana "Explore" view:
![grafana_default](https://github.com/dm112-tadbox/log-vault/blob/f154fb4c0140cac9437a45afc53ae8ef0bb499c2/doc/grafana_details.png?raw=true)

I advice you to be more creative with the Grafana dashboard setup to reach a display that would be more convenient for your purposes:
![grafana_custom](https://github.com/dm112-tadbox/log-vault/blob/f154fb4c0140cac9437a45afc53ae8ef0bb499c2/doc/grafana_custom_dashboard.png?raw=true)
![grafana_details](https://github.com/dm112-tadbox/log-vault/blob/v2/doc/grafana_custom_details.png?raw=true)

## Notifications
In some cases, we should be notified with the events occuring in the system. You may set up LogVault Notificator and notification transport to be receive the specific log messages with the defined alarm channels. A Redis v^7 instance running on the machine or distant host is required for this feature.

Sending all logs from the process to the notificator:
```ts
const { logger } = new LogVault().withNotifications();
```
Redis host is considered to run on localhost port 6379 by the default.

Setting up a Notificator instance. You ought to run it in different nodejs process:
```ts
const notificator = new Notificator().add(
  new TelegramNotificationChannel({
    token: process.env.TG_BOT_TOKEN,
    chatId: YOUR_CHAT_ID,
    matchPatterns: [
      {
        level: 'error'
      },
      {
        match: {
          message: /error/gi
        }
      }
    ]
  })
);
```

You may add patterns to match the required log records. If any of the patterns is matched, the log record will be sent to the defined channel. 

Supported pattern options:
- level: any of the supported levels
- meta: object containing plain key-value pairs
- message: string or RegExp to match

Currently, only Telegram notification channel is supported. The messages will be sent to a single chat with 5 seconds time gap by the default.

Example Telegram alarm message with the default template:

![tg_alarm](https://github.com/dm112-tadbox/log-vault/blob/ccd166e6f932fa79c224d292ac19d92971f48d59/doc/tg_alarm.png?raw=true)

## Notes on usage with microservices or distributed app
- If you use files transport, provide the full path to your logs folder if you want to avoid storing the logs in each app directory
- Use a separate Node process or microservice to serve Notificator instance
- Configure Notificator BullMQ worker to use several threads to increase the productivity
- Use the same queue name for the Notificator across the involved processes

## Configuration reference

### LogVault class constructor options

|       field       |       desc       |       type       |       default value       |
|-------------------|------------------|------------------|---------------------------|
|projectName|Name of your project|string|project root directory name (basepath of PWD env var)|
|truncateOptions|Truncate log message data|obj-walker [TruncateOptions](https://github.com/dubiousdavid/obj-walker/blob/fed829b26f8e96d7a95b3488ef13bc256e806cf8/src/types.ts#L106C1-L106C33)|{ depth: 5, stringLength: 2048, arrayLength: 12, replaceWith: "...[Truncated]"}|
|maskOptions|Masking sensitive fields options|[LogVaultMaskFieldsOptions](https://github.com/dm112-tadbox/log-vault/blob/0113fa875077f51e613a251e31a9c2e1875653da/src/types.ts#L32)|{ maskLabel: "...[Masked]", fields: ["password", "token", "otp", "secret"] }|
|... (rest parameters)|Winston logger creation options|[LoggerOptions](https://github.com/winstonjs/winston/blob/d95c948827bec80fb732fd5f05ee42b064425997/index.d.ts#L95)|{ levels: [defaultLevels](https://github.com/dm112-tadbox/log-vault/blob/v2/src/defaults/defaultLevels.ts), level: "http", exitOnError: false, defaultMeta }|


### LogVault withConsole method options

|       field       |       desc       |       type       |       default value       |
|-------------------|------------------|------------------|---------------------------|
|colors|Winston colors set for console|Winston [AbstractConfigSetColors](https://github.com/winstonjs/winston/blob/d95c948827bec80fb732fd5f05ee42b064425997/lib/winston/config/index.d.ts#L11)| [default colors](https://github.com/dm112-tadbox/log-vault/blob/v2/src/defaults/defaultColors.ts)|
|inspectOptions|Options for Node's native util.inspect|[InspectOptions](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/ad269d398919f2ce037a01b50947d1e5e030508e/types/node/v18/util.d.ts#L13)|{ compact: false, maxArrayLength: 5, maxStringLength: 2048, depth: 5,  colors: true}|
|... (rest parameters)| Winston console transport options|[ConsoleTransportOptions](https://github.com/winstonjs/winston/blob/d95c948827bec80fb732fd5f05ee42b064425997/lib/winston/transports/index.d.ts#L11)| [LogVault console formats and defaults](https://github.com/dm112-tadbox/log-vault/blob/0113fa875077f51e613a251e31a9c2e1875653da/src/LogVault.ts#L77)


### LogVault withFiles method options

|       field       |       desc       |       type       |       default value       |
|-------------------|------------------|------------------|---------------------------|
|errorLevel|name of the level that is considered as error|string|"error"|
|... (rest parameters)| Winston daily rotate file parameters | [DailyRotateFile.DailyRotateFileTransportOptions](https://github.com/winstonjs/winston-daily-rotate-file/blob/a1a4668cfea77476cd6a4a11f038c2aac9d10741/index.d.ts#L21)|[LogVault file formats and defaults](https://github.com/dm112-tadbox/log-vault/blob/0113fa875077f51e613a251e31a9c2e1875653da/src/LogVault.ts#L111)|

### LogVault withMongo method options

Only Winston [MongoDBConnectionOptions](https://github.com/winstonjs/winston-mongodb/blob/5f49b5bf6e1c8659f7f3cea4fa6ebf0e8b23d7a6/lib/winston-mongodb.d.ts#L31) are accepted there. LogVault applies a set of [formats and defaults](https://github.com/dm112-tadbox/log-vault/blob/0113fa875077f51e613a251e31a9c2e1875653da/src/LogVault.ts#L143) for the convenience.

### LogVault withLoki method options

[LokiTransportOptions](https://github.com/JaniAnttonen/winston-loki/blob/88399c802eea00f3c9115cf680ea80058e12e9f6/index.d.ts#L3) are accepted there. By the default, the "host" parameter is pointing to the localhost 3100 port.

### LogVault withNotifications method options

|       field       |       desc       |       type       |       default value       |
|-------------------|------------------|------------------|---------------------------|
|name|Project's name for BullMQ Queue|string|LogVault's instance projectName attribute value|
|queueOptions|BullMQ Queue options|[QueueOptions](https://github.com/taskforcesh/bullmq/blob/096bd810fcd5e4d923b0968bec7a4fc992c5e8a6/src/interfaces/queue-options.ts#L39)|{ connection: [defaultRedisConnection](https://github.com/dm112-tadbox/log-vault/blob/0113fa875077f51e613a251e31a9c2e1875653da/src/defaults/defaultConnections.ts#L3) }|
|jobOptions|BullMQ Redis Job options|[RedisJobOptions](https://github.com/taskforcesh/bullmq/blob/096bd810fcd5e4d923b0968bec7a4fc992c5e8a6/src/types/job-options.ts#L23)|[LogVault notifications Job options](https://github.com/dm112-tadbox/log-vault/blob/0113fa875077f51e613a251e31a9c2e1875653da/src/defaults/defaultJobOptions.ts#L1)|

### LogVault captureConsole method options

|       field       |       desc       |       type       |       default value       |
|-------------------|------------------|------------------|---------------------------|
|matchLevels|A map of Node's Console methods and Winston instance levels|{ log: string; warn: string; info: string; error: string; }|{ log: "info", warn: "warn", info: "info", error: "error" }|

### LogVault uncaptureConsole method

No parameters are required there. Use this method to give back the default methods to Node Console. 

### LogOptions constructor parameters
|       field       |       desc       |       type       |       default value       |
|-------------------|------------------|------------------|---------------------------|
|meta|An Object with flat key-value pairs|[Meta](https://github.com/dm112-tadbox/log-vault/blob/0113fa875077f51e613a251e31a9c2e1875653da/src/types.ts#L75)|---|

### Notificator constructor parameters
|       field       |       desc       |       type       |       default value       |
|-------------------|------------------|------------------|---------------------------|
|queueName|Name of LogVault notifications transport queue|string|project root directory name (basepath of PWD env var)|
|workerOpts|BullMQ Worker options|[WorkerOptions](https://github.com/taskforcesh/bullmq/blob/096bd810fcd5e4d923b0968bec7a4fc992c5e8a6/src/interfaces/worker-options.ts#L16)|{ connection: [defaultRedisConnection](https://github.com/dm112-tadbox/log-vault/blob/0113fa875077f51e613a251e31a9c2e1875653da/src/defaults/defaultConnections.ts#L3), autorun: true }|

### Notificator class methods
- "add" - receives a NotificationChannel class instance
- "stop" - stops Notificator BullMQ Worker 
- "run" - resume worker 

### TelegramNotificationChannel constructor options
|       field       |       desc       |       type       |       default value       |
|-------------------|------------------|------------------|---------------------------|
|token|Telegram bot secret|string|none (mandatory)|
|chatId|Telegram chat or group id|number|none (mandatory)|
|template|Message template in mustache format|string|[Basic template](https://github.com/dm112-tadbox/log-vault/blob/0113fa875077f51e613a251e31a9c2e1875653da/src/notificator/channels/TelegramNotificationChannel.ts#L11)|
|workerOptions|BullMQ Worker options|[WorkerOptions](https://github.com/taskforcesh/bullmq/blob/096bd810fcd5e4d923b0968bec7a4fc992c5e8a6/src/interfaces/worker-options.ts#L16)| { limiter: { max: 1, duration: 5000 } } |