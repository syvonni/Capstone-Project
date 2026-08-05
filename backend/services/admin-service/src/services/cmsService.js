const PageContent = require("../models/PageContent");
const PageChapter = require("../models/PageChapter");
const FaqSection = require("../models/FaqSection");
const InstructionContent = require("../models/InstructionContent");
const { logAuditEvent } = require("../lib/auditClient");
const logger = require("../lib/logger");

const VALID_PAGE_SLOT_IDS = [
  "privacy-policy",
  "terms-of-service",
  "bizclear-manual",
  "business-owners-manual",
  "lgu-officer-business-owners",
];

// ─── FAQ Functions ─────────────────────────────────────────────────────────────

/**
 * Get FAQ section by slotId (public)
 */
async function getFaqBySlotId(slotId) {
  const doc = await FaqSection.findOne({ slotId }).lean();
  if (!doc) return null;

  // Return published data if available and has content, otherwise fallback to main fields
  const hasPublishedData =
    doc.isPublished &&
    doc.publishedData &&
    (doc.publishedData.subtitle ||
      (doc.publishedData.items && doc.publishedData.items.length > 0));
  return hasPublishedData
    ? {
        ...doc,
        subtitle: doc.publishedData.subtitle,
        items: doc.publishedData.items,
      }
    : { ...doc, subtitle: doc.subtitle, items: doc.items };
}

/**
 * List all FAQ sections (admin)
 */
async function listFaqs() {
  const docs = await FaqSection.find().sort({ slotId: 1 }).lean();
  // Return draft data for editing, fallback to main fields if draftData is empty
  return docs.map((doc) => {
    const hasDraftData =
      doc.draftData &&
      (doc.draftData.subtitle ||
        (doc.draftData.items && doc.draftData.items.length > 0));
    return {
      ...doc,
      subtitle: hasDraftData ? doc.draftData.subtitle : doc.subtitle,
      items: hasDraftData ? doc.draftData.items : doc.items,
    };
  });
}

/**
 * Update FAQ section (admin)
 */
async function updateFaq(slotId, items, subtitle, publish, userId) {
  if (!Array.isArray(items)) {
    throw new Error("items must be an array");
  }

  const doc = await FaqSection.findOne({ slotId });
  if (!doc) throw new Error("FAQ section not found");

  // Validate each item has question and answer
  for (const item of items) {
    if (!item.question || !item.answer) {
      throw new Error("Each item must have a question and answer");
    }
  }

  if (publish) {
    // Publish: save to publishedData and set isPublished=true
    const previousState = { ...doc.toObject() };
    doc.publishedData = { subtitle, items };
    doc.isPublished = true;
    doc.subtitle = subtitle;
    doc.items = items;
    doc.updatedBy = userId;
    await doc.save();

    // Create audit log for publish
    const newState = doc.toObject();
    const changedFields = [];
    if (JSON.stringify(previousState.items) !== JSON.stringify(newState.items))
      changedFields.push("items");
    if (previousState.subtitle !== newState.subtitle)
      changedFields.push("subtitle");

    logAuditEvent("faq_updated", userId, "CMSContent", doc.slotId, {
      role: "admin",
      fieldChanged: "faq",
      oldValue: JSON.stringify(previousState),
      newValue: JSON.stringify(newState),
      slotId: doc.slotId,
      contentType: "faq",
      changedFields,
    }).catch((err) =>
      logger.warn("Failed to log audit event for FAQ update", {
        error: err.message,
      }),
    );
  } else {
    // Draft: save to draftData only
    doc.draftData = { subtitle, items };
    doc.updatedBy = userId;
    await doc.save();
  }

  return doc.toObject();
}

// ─── Instruction Functions ─────────────────────────────────────────────────────

/**
 * Get instruction content by slotId (public)
 */
async function getInstructionBySlotId(slotId) {
  const doc = await InstructionContent.findOne({ slotId }).lean();
  if (!doc) return null;

  // Return published data if available and has content, otherwise fallback to main fields
  const hasPublishedData =
    doc.isPublished &&
    doc.publishedData &&
    (doc.publishedData.description ||
      (doc.publishedData.bulletPoints &&
        doc.publishedData.bulletPoints.length > 0) ||
      (doc.publishedData.faqItems && doc.publishedData.faqItems.length > 0));
  return hasPublishedData
    ? {
        ...doc,
        description: doc.publishedData.description,
        bulletPoints: doc.publishedData.bulletPoints,
        faqItems: doc.publishedData.faqItems,
      }
    : {
        ...doc,
        description: doc.description,
        bulletPoints: doc.bulletPoints,
        faqItems: doc.faqItems,
      };
}

/**
 * List all instruction slots (admin)
 */
async function listInstructions() {
  const docs = await InstructionContent.find().sort({ slotId: 1 }).lean();
  // Return draft data for editing, fallback to main fields if draftData is empty
  return docs.map((doc) => {
    const hasDraftData =
      doc.draftData &&
      (doc.draftData.description ||
        (doc.draftData.bulletPoints && doc.draftData.bulletPoints.length > 0) ||
        (doc.draftData.faqItems && doc.draftData.faqItems.length > 0));
    return {
      ...doc,
      description: hasDraftData ? doc.draftData.description : doc.description,
      bulletPoints: hasDraftData
        ? doc.draftData.bulletPoints
        : doc.bulletPoints,
      faqItems: hasDraftData ? doc.draftData.faqItems : doc.faqItems,
    };
  });
}

/**
 * Get single instruction by slotId (admin)
 */
async function getInstructionBySlotIdAdmin(slotId) {
  const doc = await InstructionContent.findOne({ slotId }).lean();
  if (!doc) return null;

  // Return draft data for editing, fallback to main fields if draftData is empty
  const hasDraftData =
    doc.draftData &&
    (doc.draftData.description ||
      (doc.draftData.bulletPoints && doc.draftData.bulletPoints.length > 0) ||
      (doc.draftData.faqItems && doc.draftData.faqItems.length > 0));
  return {
    ...doc,
    description: hasDraftData ? doc.draftData.description : doc.description,
    bulletPoints: hasDraftData ? doc.draftData.bulletPoints : doc.bulletPoints,
    faqItems: hasDraftData ? doc.draftData.faqItems : doc.faqItems,
  };
}

/**
 * Update instruction content (admin)
 */
async function updateInstruction(
  slotId,
  description,
  bulletPoints,
  faqItems,
  publish,
  userId,
) {
  const doc = await InstructionContent.findOne({ slotId });
  if (!doc) throw new Error("Instruction content not found");

  if (bulletPoints !== undefined && !Array.isArray(bulletPoints)) {
    throw new Error("bulletPoints must be an array");
  }
  if (faqItems !== undefined && !Array.isArray(faqItems)) {
    throw new Error("faqItems must be an array");
  }

  if (publish) {
    // Publish: save to publishedData and set isPublished=true
    const previousState = { ...doc.toObject() };
    doc.publishedData = { description, bulletPoints, faqItems };
    doc.isPublished = true;
    doc.description = description;
    doc.bulletPoints = bulletPoints;
    doc.faqItems = faqItems;
    doc.updatedBy = userId;
    await doc.save();

    // Create audit log for publish
    const newState = doc.toObject();
    const changedFields = [];
    if (previousState.description !== newState.description)
      changedFields.push("description");
    if (
      JSON.stringify(previousState.bulletPoints) !==
      JSON.stringify(newState.bulletPoints)
    )
      changedFields.push("bulletPoints");
    if (
      JSON.stringify(previousState.faqItems) !==
      JSON.stringify(newState.faqItems)
    )
      changedFields.push("faqItems");

    logAuditEvent("instruction_updated", userId, "CMSContent", doc.slotId, {
      role: "admin",
      fieldChanged: "instruction",
      oldValue: JSON.stringify(previousState),
      newValue: JSON.stringify(newState),
      slotId: doc.slotId,
      contentType: "instruction",
      changedFields,
    }).catch((err) =>
      logger.warn("Failed to log audit event for instruction update", {
        error: err.message,
      }),
    );
  } else {
    // Draft: save to draftData only
    doc.draftData = { description, bulletPoints, faqItems };
    doc.updatedBy = userId;
    await doc.save();
  }

  return doc.toObject();
}

// ─── Page Functions ───────────────────────────────────────────────────────────

/**
 * Get page content by slotId (public)
 */
async function getPageBySlotId(slotId) {
  // Try chapter-based content first
  const chapters = await PageChapter.find({ pageSlotId: slotId })
    .sort({ order: 1 })
    .lean();

  if (chapters.length > 0) {
    // Return published chapter data
    const publishedChapters = chapters
      .filter((ch) => ch.isPublished)
      .map((ch) => {
        const data = ch.publishedData || {};
        return {
          _id: ch._id,
          order: ch.order,
          title: data.title || ch.title,
          description: data.description || ch.description,
          introText: data.introText || ch.introText,
          sections: data.sections || ch.sections,
        };
      });
    return { slotId, chapters: publishedChapters };
  }

  // Fallback to legacy single-document PageContent
  const doc = await PageContent.findOne({ slotId }).lean();
  if (!doc) return null;
  const hasPublishedData =
    doc.isPublished &&
    doc.publishedData &&
    (doc.publishedData.introText ||
      (doc.publishedData.sections && doc.publishedData.sections.length > 0));
  const responseData = hasPublishedData
    ? {
        ...doc,
        introText: doc.publishedData.introText,
        sections: doc.publishedData.sections,
      }
    : { ...doc, introText: doc.introText, sections: doc.sections };
  return responseData;
}

/**
 * List pages/chapters (admin)
 */
async function listPages(pageSlotId) {
  // If pageSlotId specified, return chapters for that page
  if (pageSlotId && VALID_PAGE_SLOT_IDS.includes(pageSlotId)) {
    const chapters = await PageChapter.find({ pageSlotId })
      .sort({ order: 1 })
      .lean();
    // Return draft data for editing
    const responseData = chapters.map((ch) => {
      const draft = ch.draftData;
      return {
        ...ch,
        title: draft?.title || ch.title,
        description: draft?.description || ch.description,
        introText: draft?.introText || ch.introText,
        sections: draft?.sections || ch.sections,
      };
    });
    return responseData;
  }

  // Legacy: return all PageContent docs (for backwards compat)
  const docs = await PageContent.find().sort({ slotId: 1 }).lean();
  const responseData = docs.map((doc) => {
    const hasDraftData =
      doc.draftData &&
      (doc.draftData.introText ||
        (doc.draftData.sections && doc.draftData.sections.length > 0));
    return {
      ...doc,
      introText: hasDraftData ? doc.draftData.introText : doc.introText,
      sections: hasDraftData ? doc.draftData.sections : doc.sections,
    };
  });
  return responseData;
}

/**
 * Create a new chapter (admin)
 */
async function createChapter(pageSlotId, title, description, userId) {
  if (!pageSlotId || !VALID_PAGE_SLOT_IDS.includes(pageSlotId)) {
    throw new Error("Invalid pageSlotId");
  }
  if (!title || !title.trim()) {
    throw new Error("Title is required");
  }

  // Determine next order value
  const maxOrder = await PageChapter.findOne({ pageSlotId })
    .sort({ order: -1 })
    .select("order")
    .lean();
  const nextOrder = (maxOrder?.order ?? -1) + 1;

  const chapter = await PageChapter.create({
    pageSlotId,
    order: nextOrder,
    title: title.trim(),
    description: description?.trim() || "",
    introText: "",
    sections: [],
    isPublished: false,
    updatedBy: userId,
  });

  return chapter.toObject();
}

/**
 * Update a chapter (admin)
 */
async function updateChapter(
  id,
  title,
  description,
  introText,
  sections,
  publish,
  userId,
) {
  if (sections !== undefined && !Array.isArray(sections)) {
    throw new Error("sections must be an array");
  }

  const doc = await PageChapter.findById(id);
  if (!doc) {
    // Fallback: try legacy PageContent by slotId
    const legacyDoc = await PageContent.findOne({ slotId: id });
    if (!legacyDoc) throw new Error("Chapter not found");

    // Handle legacy update
    if (publish) {
      const previousState = { ...legacyDoc.toObject() };
      legacyDoc.publishedData = { introText, sections };
      legacyDoc.isPublished = true;
      legacyDoc.introText = introText;
      legacyDoc.sections = sections;
      legacyDoc.updatedBy = userId;
      await legacyDoc.save();
      const newState = legacyDoc.toObject();
      logAuditEvent("page_updated", userId, "CMSContent", legacyDoc.slotId, {
        role: "admin",
        fieldChanged: "page",
        oldValue: JSON.stringify(previousState),
        newValue: JSON.stringify(newState),
        slotId: legacyDoc.slotId,
        contentType: "page",
        changedFields: ["sections"],
      }).catch(() => {});
    } else {
      legacyDoc.draftData = { introText, sections };
      legacyDoc.updatedBy = userId;
      await legacyDoc.save();
    }
    return legacyDoc.toObject();
  }

  const updatedData = {
    title: title !== undefined ? title.trim() : doc.title,
    description:
      description !== undefined ? description.trim() : doc.description,
    introText: introText !== undefined ? introText : doc.introText,
    sections: sections !== undefined ? sections : doc.sections,
  };

  if (publish) {
    const previousState = { ...doc.toObject() };
    doc.title = updatedData.title;
    doc.description = updatedData.description;
    doc.introText = updatedData.introText;
    doc.sections = updatedData.sections;
    doc.publishedData = { ...updatedData };
    doc.isPublished = true;
    doc.updatedBy = userId;
    await doc.save();

    const newState = doc.toObject();
    const changedFields = [];
    if (previousState.title !== newState.title) changedFields.push("title");
    if (previousState.description !== newState.description)
      changedFields.push("description");
    if (previousState.introText !== newState.introText)
      changedFields.push("introText");
    if (
      JSON.stringify(previousState.sections) !==
      JSON.stringify(newState.sections)
    )
      changedFields.push("sections");

    logAuditEvent(
      "page_updated",
      userId,
      "CMSContent",
      `${doc.pageSlotId}:${doc._id}`,
      {
        role: "admin",
        fieldChanged: "page_chapter",
        oldValue: JSON.stringify(previousState),
        newValue: JSON.stringify(newState),
        slotId: `${doc.pageSlotId}:${doc._id}`,
        contentType: "page_chapter",
        changedFields,
      },
    ).catch((err) =>
      logger.warn("Failed to log audit event for chapter update", {
        error: err.message,
      }),
    );
  } else {
    doc.draftData = { ...updatedData };
    doc.updatedBy = userId;
    await doc.save();
  }

  return doc.toObject();
}

/**
 * Delete a chapter (admin)
 */
async function deleteChapter(id) {
  const doc = await PageChapter.findByIdAndDelete(id);
  if (!doc) throw new Error("Chapter not found");

  // Re-order remaining chapters
  const remaining = await PageChapter.find({ pageSlotId: doc.pageSlotId }).sort(
    { order: 1 },
  );
  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].order !== i) {
      remaining[i].order = i;
      await remaining[i].save();
    }
  }

  return { success: true };
}

/**
 * Reorder chapters (admin)
 */
async function reorderChapters(pageSlotId, orderedIds) {
  if (!pageSlotId || !VALID_PAGE_SLOT_IDS.includes(pageSlotId)) {
    throw new Error("Invalid pageSlotId");
  }
  if (!Array.isArray(orderedIds)) {
    throw new Error("orderedIds must be an array");
  }

  const bulkOps = orderedIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id, pageSlotId },
      update: { $set: { order: index } },
    },
  }));
  await PageChapter.bulkWrite(bulkOps);

  const updated = await PageChapter.find({ pageSlotId })
    .sort({ order: 1 })
    .lean();
  return updated;
}

/**
 * Update legacy PageContent (admin)
 */
async function updateLegacyPage(slotId, introText, sections, publish, userId) {
  const doc = await PageContent.findOne({ slotId });
  if (!doc) throw new Error("Page content not found");

  if (sections !== undefined && !Array.isArray(sections)) {
    throw new Error("sections must be an array");
  }

  if (publish) {
    doc.publishedData = { introText, sections };
    doc.isPublished = true;
    doc.introText = introText;
    doc.sections = sections;
    doc.updatedBy = userId;
    await doc.save();
  } else {
    doc.draftData = { introText, sections };
    doc.updatedBy = userId;
    await doc.save();
  }

  return doc.toObject();
}

module.exports = {
  // FAQ
  getFaqBySlotId,
  listFaqs,
  updateFaq,
  // Instructions
  getInstructionBySlotId,
  listInstructions,
  getInstructionBySlotIdAdmin,
  updateInstruction,
  // Pages
  getPageBySlotId,
  listPages,
  createChapter,
  updateChapter,
  deleteChapter,
  reorderChapters,
  updateLegacyPage,
};
