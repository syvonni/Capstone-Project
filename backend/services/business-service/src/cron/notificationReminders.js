const PostDocument = require("../models/PostDocument");
const Payment = require("../models/Payment");

async function createNotification(
  userId,
  type,
  title,
  message,
  entityType,
  entityId,
  metadata,
) {
  try {
    const Notification = require("../models/Notification");
    await Notification.create({
      userId,
      type,
      title,
      message,
      relatedEntityType: entityType,
      relatedEntityId: entityId,
      metadata,
    });
  } catch (err) {
    console.error(
      "[NotifReminder] Failed to create notification:",
      err.message,
    );
  }
}

async function checkPostDocumentDue() {
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const dueItems = await PostDocument.find({
    status: "pending",
    dueDate: { $gte: now, $lte: threeDaysFromNow },
  }).lean();

  for (const item of dueItems) {
    if (item.ownerId) {
      await createNotification(
        item.ownerId,
        "post_requirement_due",
        "Post-Requirement Due Soon",
        `Your post-requirement "${item.requirementType || item.description}" is due on ${new Date(item.dueDate).toLocaleDateString()}.`,
        "post_requirement",
        item._id.toString(),
        { businessId: item.businessId },
      );
    }
  }
  return dueItems.length;
}

async function checkOverduePostDocuments() {
  const overdueItems = await PostDocument.find({
    status: "overdue",
  }).lean();

  for (const item of overdueItems) {
    if (item.ownerId) {
      await createNotification(
        item.ownerId,
        "post_requirement_overdue",
        "Post-Requirement Overdue",
        `Your post-requirement "${item.requirementType || item.description}" is overdue.`,
        "post_requirement",
        item._id.toString(),
        { businessId: item.businessId },
      );
    }
  }
  return overdueItems.length;
}

module.exports = { checkPostDocumentDue, checkOverduePostDocuments };
