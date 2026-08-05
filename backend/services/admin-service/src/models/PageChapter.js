const mongoose = require("mongoose");

const SectionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
  },
  { _id: false },
);

const ChapterDataSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    introText: { type: String, default: "" },
    sections: { type: [SectionSchema], default: [] },
  },
  { _id: false },
);

const PageChapterSchema = new mongoose.Schema(
  {
    pageSlotId: {
      type: String,
      required: true,
      enum: [
        "privacy-policy",
        "terms-of-service",
        "bizclear-manual",
        "business-owners-manual",
        "lgu-officer-business-owners",
      ],
      index: true,
    },
    order: { type: Number, required: true, default: 0 },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    introText: { type: String, default: "" },
    sections: { type: [SectionSchema], default: [] },
    isPublished: { type: Boolean, default: false },
    draftData: { type: ChapterDataSchema, default: null },
    publishedData: { type: ChapterDataSchema, default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

PageChapterSchema.index({ pageSlotId: 1, order: 1 });

module.exports = mongoose.model("PageChapter", PageChapterSchema);
