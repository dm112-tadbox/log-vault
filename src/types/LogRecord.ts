export interface LogRecord {
  level: string;
  message: string;
  labels: {
    [key: string]: string;
  };
}
