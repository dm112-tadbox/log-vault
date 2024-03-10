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