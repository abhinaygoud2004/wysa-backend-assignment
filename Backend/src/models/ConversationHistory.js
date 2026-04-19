const mongoose = require('mongoose');

const ConversationHistorySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    moduleId: { type: String, required: true },
    questionId: { type: String, required: true },
    questionText: { type: String, required: true },
    selectedOptionId: { type: String, required: true },
    selectedOptionText: { type: String, required: true },
  },
  { timestamps: true }
);

ConversationHistorySchema.index({ userId: 1, moduleId: 1, createdAt: 1 });

module.exports = mongoose.model('ConversationHistory', ConversationHistorySchema);