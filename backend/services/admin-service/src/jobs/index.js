/**
 * Background Jobs for Admin Service
 * Scheduled tasks for account deletion and notifications
 */

const logger = require("../lib/logger");

// Import job functions
const finalizeAccountDeletions = require("./finalizeAccountDeletions");
const sendDeletionReminders = require("./sendDeletionReminders");
const expirePendingApprovals = require("./expirePendingApprovals");
const {
  checkAndSendMaintenanceNotifications,
} = require("../cron/maintenanceNotification");

// Try to use node-cron, fallback to setInterval if not available
let cron = null;
try {
  cron = require("node-cron");
} catch (error) {
  logger.warn("node-cron not available, using setInterval fallback");
}

const jobIntervals = [];

/**
 * Schedule a job using cron or setInterval fallback
 */
function scheduleJob(cronExpression, jobFunction, description) {
  if (cron) {
    cron.schedule(cronExpression, jobFunction);
    logger.info(`Scheduled job: ${description} (cron: ${cronExpression})`);
  } else {
    // Fallback: Convert cron expression to interval (simplified)
    let intervalMs = 24 * 60 * 60 * 1000; // Default daily

    if (cronExpression === "0 2 * * *") {
      intervalMs = 24 * 60 * 60 * 1000; // Daily at 2 AM
    } else if (cronExpression === "0 9 * * *") {
      intervalMs = 24 * 60 * 60 * 1000; // Daily at 9 AM
    } else if (cronExpression === "0 * * * *") {
      intervalMs = 60 * 60 * 1000; // Every hour
    }

    const interval = setInterval(jobFunction, intervalMs);
    jobIntervals.push(interval);
    logger.info(`Scheduled job: ${description} (interval: ${intervalMs}ms)`);
  }
}

/**
 * Initialize and start all background jobs for Admin Service
 */
function startJobs() {
  if (process.env.NODE_ENV === "test") {
    logger.info("Skipping background jobs in test environment");
    return;
  }

  logger.info("Starting Admin Service background jobs...");

  // Finalize account deletions (run daily at 2 AM)
  scheduleJob(
    "0 2 * * *",
    async () => {
      try {
        logger.info("Running job: finalizeAccountDeletions");
        await finalizeAccountDeletions();
      } catch (error) {
        logger.error("Error in finalizeAccountDeletions job", { error });
      }
    },
    "finalizeAccountDeletions",
  );

  // Send deletion reminders (run daily at 9 AM)
  scheduleJob(
    "0 9 * * *",
    async () => {
      try {
        logger.info("Running job: sendDeletionReminders");
        await sendDeletionReminders();
      } catch (error) {
        logger.error("Error in sendDeletionReminders job", { error });
      }
    },
    "sendDeletionReminders",
  );

  // Notify admins of new tamper incidents (every 10 minutes)
  scheduleJob(
    "*/10 * * * *",
    async () => {
      try {
        await notifyTamperIncidents();
      } catch (error) {
        logger.error("Error in notifyTamperIncidents job", { error });
      }
    },
    "notifyTamperIncidents",
  );

  // Expire pending maintenance approvals after 48 hours (run hourly)
  scheduleJob(
    "0 * * * *",
    async () => {
      try {
        await expirePendingApprovals();
      } catch (error) {
        logger.error("Error in expirePendingApprovals job", { error });
      }
    },
    "expirePendingApprovals",
  );

  // Send maintenance notifications 1 day before scheduled maintenance (run daily at 9 AM)
  scheduleJob(
    "0 9 * * *",
    async () => {
      try {
        await checkAndSendMaintenanceNotifications();
      } catch (error) {
        logger.error("Error in checkAndSendMaintenanceNotifications job", {
          error,
        });
      }
    },
    "checkAndSendMaintenanceNotifications",
  );

  logger.info("Admin Service background jobs started successfully");
}

/**
 * Stop all background jobs (for graceful shutdown)
 */
function stopJobs() {
  logger.info("Stopping Admin Service background jobs...");
  jobIntervals.forEach((interval) => clearInterval(interval));
  jobIntervals.length = 0;
  logger.info("Admin Service background jobs stopped");
}

module.exports = {
  startJobs,
  stopJobs,
};
