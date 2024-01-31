export interface LogRecord {
  timestamp?: string;
  level: string;
  message: string[];
  labels: {
    [key: string]: string;
  };
}
