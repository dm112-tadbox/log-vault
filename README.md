# Log vault

Warning! The application is under the development. Please, do not use in the production.

## Description

Log vault is a library, intended to use in projects where you are required to collect, store and structure the logs, produced by your nodejs process.

## Features

- capture console outputs of your app process
- collect processes names, timestamps, environment variables, host ip address automatically
- collect and store logs in different destinations: text files (with rotation), mongo, graylog

## Usage

```
npm install log-vault

```


# ToDo:
- write readme
- fix files transport format (include labels)
- disable braces for single string message
- add paddings for console messages format (console.log not producin, logger.log - producing)
- unlink Loki in case of connection error by the default