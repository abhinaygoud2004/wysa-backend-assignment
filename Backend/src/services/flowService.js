const ConversationHistory = require('../models/ConversationHistory');
const UserState = require('../models/UserState');
const { getModule, getOption, getQuestion } = require('./moduleService');

async function resolveActiveQuestionId(userId, moduleId, moduleDoc, currentQuestionId) {
  if (currentQuestionId === null) {
    return null;
  }

  const resolvedQuestionId = currentQuestionId || moduleDoc.entryQuestionId;
  if (moduleDoc.findQuestion(resolvedQuestionId)) {
    return resolvedQuestionId;
  }

  await UserState.updateOne(
    { userId, moduleId },
    { currentQuestionId: moduleDoc.entryQuestionId }
  );

  return moduleDoc.entryQuestionId;
}

async function startModule(userId, moduleId) {
  const moduleDoc = await getModule(moduleId);

  const state = await UserState.findOneAndUpdate(
    { userId, moduleId },
    {
      $setOnInsert: {
        userId,
        moduleId,
        currentQuestionId: moduleDoc.entryQuestionId,
        checkpointQuestionId: null,
        questionStack: [],
      },
    },
    { upsert: true, new: true }
  );

  if (state.currentQuestionId === null) {
    return { flowComplete: true, moduleDoc, question: null, state };
  }

  const activeQuestionId = await resolveActiveQuestionId(
    userId,
    moduleId,
    moduleDoc,
    state.currentQuestionId
  );
  const question = getQuestion(moduleDoc, activeQuestionId);

  return { flowComplete: false, moduleDoc, question, state };
}

async function getCurrentQuestion(userId, moduleId, requestedQuestionId = null) {
  const moduleDoc = await getModule(moduleId);

  let state = await UserState.findOne({ userId, moduleId });
  if (!state) {
    state = await UserState.create({
      userId,
      moduleId,
      currentQuestionId: moduleDoc.entryQuestionId,
      checkpointQuestionId: null,
      questionStack: [],
    });
  }

  if (state.currentQuestionId === null) {
    return {
      flowComplete: true,
      moduleDoc,
      question: null,
      staleLinkResolved: Boolean(requestedQuestionId),
    };
  }

  const resolvedQuestionId = await resolveActiveQuestionId(
    userId,
    moduleId,
    moduleDoc,
    state.currentQuestionId
  );

  let staleLinkResolved = false;
  if (requestedQuestionId && requestedQuestionId !== resolvedQuestionId) {
    staleLinkResolved = true;
  }

  return {
    flowComplete: false,
    moduleDoc,
    question: getQuestion(moduleDoc, resolvedQuestionId),
    staleLinkResolved,
  };
}

async function submitAnswer(userId, moduleId, questionId, optionId) {
  const moduleDoc = await getModule(moduleId);
  const state = await UserState.findOne({ userId, moduleId });

  if (!state) {
    const error = new Error(
      `No active state found for user "${userId}" in module "${moduleId}". Start the module first.`
    );
    error.statusCode = 404;
    throw error;
  }

  if (state.currentQuestionId === null) {
    const error = new Error(
      `Module "${moduleId}" is already complete for user "${userId}".`
    );
    error.statusCode = 400;
    throw error;
  }

  if (state.currentQuestionId !== questionId) {
    const error = new Error(
      `Question "${questionId}" is no longer active for user "${userId}" in module "${moduleId}". Current question is "${state.currentQuestionId}".`
    );
    error.statusCode = 409;
    throw error;
  }

  const question = getQuestion(moduleDoc, questionId);
  const option = getOption(question, optionId);
  const nextStack = question.isCheckpoint
    ? [question.id]
    : [...(state.questionStack || []), question.id];

  await ConversationHistory.create({
    userId,
    moduleId,
    questionId: question.id,
    questionText: question.text,
    selectedOptionId: option.id,
    selectedOptionText: option.text,
  });

  if (question.isCheckpoint) {
    await UserState.updateOne(
      { userId, moduleId },
      {
        checkpointQuestionId: question.id,
        questionStack: [question.id],
      }
    );
  }

  if (option.nextModuleId) {
    const nextModule = await getModule(option.nextModuleId);
    const entryQuestionId =
      option.nextModuleEntryQuestionId || nextModule.entryQuestionId;
    const entryQuestion = nextModule.findQuestion(entryQuestionId);

    if (!entryQuestion) {
      const error = new Error(
        `Broken reference: entry question "${entryQuestionId}" not found in module "${option.nextModuleId}"`
      );
      error.statusCode = 500;
      throw error;
    }

    const targetState = await UserState.findOneAndUpdate(
      { userId, moduleId: option.nextModuleId },
      {
        $setOnInsert: {
          userId,
          moduleId: option.nextModuleId,
          currentQuestionId: entryQuestionId,
          checkpointQuestionId: null,
          questionStack: [],
        },
      },
      { upsert: true, new: true }
    );

    if (targetState.currentQuestionId === null) {
      return {
        flowComplete: true,
        moduleDoc: nextModule,
        question: null,
        switchedModule: true,
      };
    }

    const targetQuestionId = await resolveActiveQuestionId(
      userId,
      option.nextModuleId,
      nextModule,
      targetState.currentQuestionId
    );
    const targetQuestion = getQuestion(nextModule, targetQuestionId);

    return {
      flowComplete: false,
      moduleDoc: nextModule,
      question: targetQuestion,
      switchedModule: true,
    };
  }

  if (!option.nextQuestionId) {
    await UserState.updateOne(
      { userId, moduleId },
      {
        currentQuestionId: null,
        questionStack: nextStack,
      }
    );

    return {
      flowComplete: true,
      moduleDoc,
      question: null,
      switchedModule: false,
    };
  }

  const nextQuestion = moduleDoc.findQuestion(option.nextQuestionId);
  if (!nextQuestion) {
    const error = new Error(
      `Broken reference: next question "${option.nextQuestionId}" does not exist in module "${moduleId}"`
    );
    error.statusCode = 500;
    throw error;
  }

  await UserState.updateOne(
    { userId, moduleId },
    {
      currentQuestionId: nextQuestion.id,
      checkpointQuestionId: question.isCheckpoint
        ? question.id
        : state.checkpointQuestionId,
      questionStack: nextStack,
    }
  );

  return {
    flowComplete: false,
    moduleDoc,
    question: nextQuestion,
    switchedModule: false,
  };
}

async function getHistory(userId, moduleId = null) {
  const filter = { userId };

  if (moduleId) {
    filter.moduleId = moduleId;
  }

  return ConversationHistory.find(filter).sort({ createdAt: 1 }).lean();
}

async function goBack(userId, moduleId) {
  const moduleDoc = await getModule(moduleId);
  const state = await UserState.findOne({ userId, moduleId });

  if (!state || !state.questionStack || state.questionStack.length === 0) {
    const error = new Error(
      'Already at the first question in this module - cannot go back further.'
    );
    error.statusCode = 400;
    throw error;
  }

  const previousQuestionId = state.questionStack[state.questionStack.length - 1];
  const previousQuestion = moduleDoc.findQuestion(previousQuestionId);

  if (!previousQuestion) {
    const error = new Error(
      `Previous question "${previousQuestionId}" no longer exists in module "${moduleId}"`
    );
    error.statusCode = 500;
    throw error;
  }

  await UserState.updateOne(
    { userId, moduleId },
    {
      currentQuestionId: previousQuestionId,
      questionStack: state.questionStack.slice(0, -1),
    }
  );

  return { moduleDoc, question: previousQuestion };
}

module.exports = {
  getCurrentQuestion,
  getHistory,
  goBack,
  startModule,
  submitAnswer,
};
