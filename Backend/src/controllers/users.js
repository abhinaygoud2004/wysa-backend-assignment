const {
  getCurrentQuestion: getCurrentQuestionFlow,
  getHistory: getHistoryFlow,
  goBack: goBackFlow,
  submitAnswer: submitAnswerFlow,
} = require('../services/flowService');

async function getCurrentQuestion(req, res, next) {
  try {
    const { userId } = req.params;
    const { moduleId, questionId } = req.query;

    if (!moduleId) {
      return res
        .status(400)
        .json({ success: false, error: 'moduleId query param is required' });
    }

    const { flowComplete, moduleDoc, question, staleLinkResolved } =
      await getCurrentQuestionFlow(userId, moduleId, questionId || null);

    res.json({
      success: true,
      moduleId: moduleDoc._id,
      moduleName: moduleDoc.name,
      flowComplete,
      staleLinkResolved,
      question: formatQuestion(question),
    });
  } catch (error) {
    next(error);
  }
}

async function submitAnswer(req, res, next) {
  try {
    const { userId } = req.params;
    const { moduleId, questionId, optionId } = req.body;

    if (!moduleId || !questionId || !optionId) {
      return res.status(400).json({
        success: false,
        error: 'moduleId, questionId, and optionId are required in the request body',
      });
    }

    const { flowComplete, moduleDoc, question, switchedModule } =
      await submitAnswerFlow(userId, moduleId, questionId, optionId);

    if (flowComplete) {
      return res.json({
        success: true,
        flowComplete: true,
        switchedModule,
        moduleId: moduleDoc._id,
        moduleName: moduleDoc.name,
        question: null,
        message: 'You have completed this module.',
      });
    }

    res.json({
      success: true,
      flowComplete: false,
      switchedModule,
      moduleId: moduleDoc._id,
      moduleName: moduleDoc.name,
      question: formatQuestion(question),
    });
  } catch (error) {
    next(error);
  }
}

async function getHistory(req, res, next) {
  try {
    const { userId } = req.params;
    const { moduleId } = req.query;
    const history = await getHistoryFlow(userId, moduleId || null);

    res.json({ success: true, count: history.length, history });
  } catch (error) {
    next(error);
  }
}

async function goBack(req, res, next) {
  try {
    const { userId } = req.params;
    const { moduleId } = req.body;

    if (!moduleId) {
      return res
        .status(400)
        .json({ success: false, error: 'moduleId is required in the request body' });
    }

    const { moduleDoc, question } = await goBackFlow(userId, moduleId);

    res.json({
      success: true,
      moduleId: moduleDoc._id,
      moduleName: moduleDoc.name,
      question: formatQuestion(question),
    });
  } catch (error) {
    next(error);
  }
}

function formatQuestion(question) {
  if (!question) {
    return null;
  }

  return {
    id: question.id,
    text: question.text,
    isCheckpoint: question.isCheckpoint,
    options: question.options.map((option) => ({
      id: option.id,
      text: option.text,
    })),
  };
}

module.exports = {
  getCurrentQuestion,
  getHistory,
  goBack,
  submitAnswer,
};
