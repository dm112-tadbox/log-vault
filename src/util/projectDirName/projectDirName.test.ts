import { projectDirName } from "./projectDirName";

describe("projectDirName util function", () => {
  it("get project dir name", () => {
    const name = projectDirName();
    expect(name).toEqual("log-vault");
  });
});
