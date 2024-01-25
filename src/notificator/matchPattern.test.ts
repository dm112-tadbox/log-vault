import { NotificationChannel } from "./channels/NotificationChannel";
import { matchPattern } from "./matchPattern";

describe("match log patterns", () => {
  it("match anything by empty pattern by the default", () => {
    const channel = new NotificationChannel({
      queueName: "test-queue",
      patterns: [{}]
    });

    const log = {
      level: "info",
      message: ["New notification"],
      labels: {
        project: "log-vault",
        process: "log-vault",
        environment: "test"
      },
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([channel]);
  });

  it("match anything by empty patterns array", () => {
    const channel = new NotificationChannel({
      queueName: "test-queue",
      patterns: []
    });

    const log = {
      level: "info",
      message: ["New notification"],
      labels: {
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
      queueName: "test-queue",
      patterns: [
        {
          level: "info"
        }
      ]
    });

    const log = {
      level: "info",
      message: ["New notification"],
      labels: {
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
      queueName: "test-queue",
      patterns: [
        {
          level: "error"
        }
      ]
    });

    const log = {
      level: "info",
      message: ["New notification"],
      labels: {
        project: "log-vault",
        process: "log-vault",
        environment: "test"
      },
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([]);
  });

  it("match by a single label", () => {
    const channel = new NotificationChannel({
      queueName: "test-queue",
      patterns: [
        {
          process: "log-vault-process"
        }
      ]
    });

    const log = {
      level: "info",
      message: ["New notification"],
      labels: {
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
      queueName: "test-queue",
      patterns: [
        {
          project: "another project"
        }
      ]
    });

    const log = {
      level: "info",
      message: ["New notification"],
      labels: {
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
      queueName: "test-queue",
      patterns: [
        {
          some: "another project"
        }
      ]
    });

    const log = {
      level: "info",
      message: ["New notification"],
      labels: {
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
      queueName: "test-queue",
      patterns: [
        {
          project: "log-vault",
          process: "log-vault-process",
          environment: "test"
        }
      ]
    });

    const log = {
      level: "info",
      message: ["New notification"],
      labels: {
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
      queueName: "test-queue",
      patterns: [
        {
          project: "log-vault",
          process: "log-vault-process",
          environment: "development"
        }
      ]
    });

    const log = {
      level: "info",
      message: ["New notification"],
      labels: {
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
      queueName: "test-queue",
      patterns: [
        {
          level: "info",
          project: "log-vault"
        }
      ]
    });

    const log = {
      level: "info",
      message: ["New notification"],
      labels: {
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
      queueName: "test-queue",
      patterns: [
        {
          level: "info",
          project: "log-vault"
        }
      ]
    });

    const log = {
      level: "error",
      message: ["New notification"],
      labels: {
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
      queueName: "test-queue",
      patterns: [
        {
          level: "info",
          project: "log-vault"
        }
      ]
    });

    const log = {
      level: "info",
      message: ["New notification"],
      labels: {
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
      queueName: "test-queue",
      patterns: [
        {
          level: "info",
          project: "log-vault"
        }
      ]
    });

    const log = {
      level: "info",
      message: ["New notification"],
      labels: {
        process: "log-vault-process",
        environment: "test"
      },
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([]);
  });

  it("match by message text", () => {
    const channel = new NotificationChannel({
      queueName: "test-queue",
      patterns: [
        {
          message: "New"
        }
      ]
    });

    const log = {
      level: "info",
      message: ["New notification"],
      labels: {
        process: "log-vault-process",
        environment: "test"
      },
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([channel]);
  });

  it("dismatch by message text", () => {
    const channel = new NotificationChannel({
      queueName: "test-queue",
      patterns: [
        {
          message: "Some"
        }
      ]
    });

    const log = {
      level: "info",
      message: ["New notification"],
      labels: {
        process: "log-vault-process",
        environment: "test"
      },
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([]);
  });

  it("match by message regexp", () => {
    const channel = new NotificationChannel({
      queueName: "test-queue",
      patterns: [
        {
          message: /New\snotification/g
        }
      ]
    });

    const log = {
      level: "info",
      message: ["New notification"],
      labels: {
        process: "log-vault-process",
        environment: "test"
      },
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([channel]);
  });

  it("dismatch by empty message", () => {
    const channel = new NotificationChannel({
      queueName: "test-queue",
      patterns: [
        {
          message: /New\snotification/g
        }
      ]
    });

    const log = {
      level: "info",
      message: [""],
      labels: {
        process: "log-vault-process",
        environment: "test"
      },
      timestamp: "2024-01-25T11:42:40.123Z"
    };

    expect(matchPattern(log, [channel])).toEqual([]);
  });
});
