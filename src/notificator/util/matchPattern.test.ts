import { NotificationChannel } from "../channels/NotificationChannel";
import { matchPattern } from "./matchPattern";

describe("match log patterns", () => {
  it("match anything by empty patterns array", () => {
    const channel = new NotificationChannel({
      matchPatterns: []
    });

    const log = {
      level: "info",
      message: "New notification",
      meta: {
        project: "log-vault",
        process: "log-vault",
        environment: "test"
      },
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([channel]);
  });

  it("match by level", () => {
    const channel = new NotificationChannel({
      matchPatterns: [
        {
          level: "info"
        }
      ]
    });

    const log = {
      level: "info",
      message: "New notification",
      meta: {
        project: "log-vault",
        process: "log-vault",
        environment: "test"
      },
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([channel]);
  });

  it("dismatch by level", () => {
    const channel = new NotificationChannel({
      matchPatterns: [
        {
          level: "error"
        }
      ]
    });

    const log = {
      level: "info",
      message: "New notification",
      meta: {
        project: "log-vault",
        process: "log-vault",
        environment: "test"
      },
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([]);
  });

  it("match by a single meta key", () => {
    const channel = new NotificationChannel({
      matchPatterns: [
        {
          match: {
            meta: {
              process: "log-vault-process"
            }
          }
        }
      ]
    });

    const log = {
      level: "info",
      message: "New notification",
      meta: {
        project: "log-vault",
        process: "log-vault-process",
        environment: "test"
      },
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([channel]);
  });

  it("dismatch by a single label", () => {
    const channel = new NotificationChannel({
      matchPatterns: [
        {
          match: {
            meta: {
              project: "another project"
            }
          }
        }
      ]
    });

    const log = {
      level: "info",
      message: "New notification",
      meta: {
        project: "log-vault",
        process: "log-vault-process",
        environment: "test"
      },
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([]);
  });

  it("dismatch by a single missing label", () => {
    const channel = new NotificationChannel({
      matchPatterns: [
        {
          match: { meta: { some: "another project" } }
        }
      ]
    });

    const log = {
      level: "info",
      message: "New notification",
      meta: {
        project: "log-vault",
        process: "log-vault-process",
        environment: "test"
      },
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([]);
  });

  it("match by several labels", () => {
    const channel = new NotificationChannel({
      matchPatterns: [
        {
          match: {
            meta: {
              project: "log-vault",
              process: "log-vault-process",
              environment: "test"
            }
          }
        }
      ]
    });

    const log = {
      level: "info",
      message: "New notification",
      meta: {
        project: "log-vault",
        process: "log-vault-process",
        environment: "test"
      },
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([channel]);
  });

  it("dismatch by a label in several labels", () => {
    const channel = new NotificationChannel({
      matchPatterns: [
        {
          match: {
            meta: {
              project: "log-vault",
              process: "log-vault-process",
              environment: "development"
            }
          }
        }
      ]
    });

    const log = {
      level: "info",
      message: "New notification",
      meta: {
        project: "log-vault",
        process: "log-vault-process",
        environment: "test"
      },
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([]);
  });

  it("match by label and level", () => {
    const channel = new NotificationChannel({
      matchPatterns: [
        {
          level: "info",
          match: { meta: { project: "log-vault" } }
        }
      ]
    });

    const log = {
      level: "info",
      message: "New notification",
      meta: {
        project: "log-vault",
        process: "log-vault-process",
        environment: "test"
      },
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([channel]);
  });

  it("match by label dismatch by level", () => {
    const channel = new NotificationChannel({
      matchPatterns: [
        {
          match: { meta: { level: "info", project: "log-vault" } }
        }
      ]
    });

    const log = {
      level: "error",
      message: "New notification",
      meta: {
        project: "log-vault",
        process: "log-vault-process",
        environment: "test"
      },
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([]);
  });

  it("match by level dismatch by label", () => {
    const channel = new NotificationChannel({
      matchPatterns: [
        {
          match: { meta: { level: "info", project: "log-vault" } }
        }
      ]
    });

    const log = {
      level: "info",
      message: "New notification",
      meta: {
        project: "some-project",
        process: "log-vault-process",
        environment: "test"
      },
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([]);
  });

  it("match by level dismatch by missing label", () => {
    const channel = new NotificationChannel({
      matchPatterns: [
        {
          match: { meta: { level: "info", project: "log-vault" } }
        }
      ]
    });

    const log = {
      level: "info",
      message: "New notification",
      meta: {
        process: "log-vault-process",
        environment: "test"
      },
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([]);
  });

  it("match by message text", () => {
    const channel = new NotificationChannel({
      matchPatterns: [
        {
          match: { message: "New" }
        }
      ]
    });

    const log = {
      level: "info",
      message: "New notification",
      meta: {
        process: "log-vault-process",
        environment: "test"
      },
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([channel]);
  });

  it("dismatch by message text", () => {
    const channel = new NotificationChannel({
      matchPatterns: [
        {
          match: { message: "Some" }
        }
      ]
    });

    const log = {
      level: "info",
      message: "New notification",
      meta: {
        process: "log-vault-process",
        environment: "test"
      },
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([]);
  });

  it("match by message regexp", () => {
    const channel = new NotificationChannel({
      matchPatterns: [
        {
          match: { message: /New\snotification/g }
        }
      ]
    });

    const log = {
      level: "info",
      message: "New notification",
      meta: {
        process: "log-vault-process",
        environment: "test"
      },
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([channel]);
  });

  it("dismatch by empty message", () => {
    const channel = new NotificationChannel({
      matchPatterns: [
        {
          match: { message: /New\snotification/g }
        }
      ]
    });

    const log = {
      level: "info",
      message: "",
      meta: {
        process: "log-vault-process",
        environment: "test"
      },
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([]);
  });

  it("exclude pattern: exclude by meta, match", () => {
    const channel = new NotificationChannel({
      matchPatterns: [
        {
          exclude: {
            meta: { some: "label" }
          }
        }
      ]
    });

    const log = {
      level: "info",
      message: "Some message",
      meta: {
        process: "log-vault-process",
        environment: "test"
      },
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([channel]);
  });

  it("exclude pattern: exclude by meta, match with no meta", () => {
    const channel = new NotificationChannel({
      matchPatterns: [
        {
          exclude: {
            meta: { some: "label" }
          }
        }
      ]
    });

    const log = {
      level: "info",
      message: "Some message",
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([channel]);
  });

  it("exclude pattern: exclude by meta, mismatch by single meta", () => {
    const channel = new NotificationChannel({
      matchPatterns: [
        {
          exclude: {
            meta: { some: "label" }
          }
        }
      ]
    });

    const log = {
      level: "info",
      message: "Some message",
      meta: {
        some: "label"
      },
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([]);
  });

  it("exclude pattern: exclude by message regexp, mismatch", () => {
    const channel = new NotificationChannel({
      matchPatterns: [
        {
          level: "http",
          exclude: {
            message: /Should\snot\sbe\snotified/gi
          }
        }
      ]
    });

    const log = {
      level: "http",
      message: "Some message",
      meta: {
        some: "label"
      },
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([channel]);
  });

  it("exclude pattern: exclude by message regexp, match", () => {
    const channel = new NotificationChannel({
      matchPatterns: [
        {
          level: "http",
          exclude: {
            message: /Should\snot\sbe\snotified/gi
          }
        }
      ]
    });

    const log = {
      level: "http",
      message: JSON.stringify(
        { details: "Some message that should not be notified with." },
        null,
        2
      ),
      meta: {
        some: "label"
      },
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([]);
  });
});
