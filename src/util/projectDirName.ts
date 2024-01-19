import { basename } from "path";

export function projectDirName(): string {
  const dirPath = process.env.PWD;
  return dirPath ? basename(dirPath) : "";
}
