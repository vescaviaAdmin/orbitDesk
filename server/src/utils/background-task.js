export function runInBackground(app, label, task, context = {}) {
  setImmediate(async () => {
    try {
      await task();
      app.log.info({ label, ...context }, "Background task completed");
    } catch (error) {
      app.log.warn(
        {
          label,
          ...context,
          err: error,
        },
        "Background task failed",
      );
    }
  });
}
