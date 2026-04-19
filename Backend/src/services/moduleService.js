const Module = require('../models/Module');

async function getModule(moduleId) {
  const moduleDoc = await Module.findById(moduleId);

  if (!moduleDoc) {
    const error = new Error(`Module "${moduleId}" not found`);
    error.statusCode = 404;
    throw error;
  }

  return moduleDoc;
}

function getQuestion(moduleDoc, questionId) {
  const question = moduleDoc.findQuestion(questionId);

  if (!question) {
    const error = new Error(
      `Question "${questionId}" not found in module "${moduleDoc._id}"`
    );
    error.statusCode = 404;
    throw error;
  }

  return question;
}

function getOption(question, optionId) {
  const option = question.options.find((entry) => entry.id === optionId);

  if (!option) {
    const error = new Error(
      `Option "${optionId}" is not valid for question "${question.id}". Valid options: [${question.options
        .map((entry) => entry.id)
        .join(', ')}]`
    );
    error.statusCode = 400;
    throw error;
  }

  return option;
}

module.exports = {
  getModule,
  getOption,
  getQuestion,
};
