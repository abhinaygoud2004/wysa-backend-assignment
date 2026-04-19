const mongoose = require('mongoose');

const OptionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    nextQuestionId: { type: String, default: null },
    nextModuleId: { type: String, default: null },
    nextModuleEntryQuestionId: { type: String, default: null },
  },
  { _id: false }
);

const QuestionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    isCheckpoint: { type: Boolean, default: false },
    options: { type: [OptionSchema], required: true },
  },
  { _id: false }
);

const ModuleSchema = new mongoose.Schema(
  {
    _id: { type: String },
    name: { type: String, required: true },
    entryQuestionId: { type: String, required: true },
    questions: { type: [QuestionSchema], required: true },
  },
  { timestamps: true }
);

ModuleSchema.methods.findQuestion = function findQuestion(questionId) {
  return this.questions.find((question) => question.id === questionId) || null;
};

module.exports = mongoose.model('Module', ModuleSchema);