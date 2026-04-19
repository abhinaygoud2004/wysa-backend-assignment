const mongoose = require('mongoose');

const UserStateSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    moduleId: { type: String, required: true },
    currentQuestionId: { type: String, default: null },
    checkpointQuestionId: { type: String, default: null },
    questionStack: { type: [String], default: [] },
  },
  { timestamps: true }
);

UserStateSchema.index({ userId: 1, moduleId: 1 }, { unique: true });

module.exports = mongoose.model('UserState', UserStateSchema);