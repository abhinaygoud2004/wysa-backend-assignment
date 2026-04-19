const Module = require('../models/Module');
const { startModule: startModuleFlow } = require('../services/flowService');

async function createOrUpdateModule(req, res, next) {
  try {
    const moduleDoc = await Module.findByIdAndUpdate(req.body._id, req.body, {
      upsert: true,
      new: true,
      runValidators: true,
    });

    res.status(201).json({ success: true, module: moduleDoc });
  } catch (error) {
    next(error);
  }
}

async function getAllModules(req, res, next) {
  try {
    const modules = await Module.find({}, '_id name entryQuestionId').lean();
    res.json({ success: true, modules });
  } catch (error) {
    next(error);
  }
}

async function startModule(req, res, next) {
  try {
    const { moduleId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, error: 'userId query param is required' });
    }

    const { flowComplete, moduleDoc, question, state } = await startModuleFlow(
      userId,
      moduleId
    );

    res.json({
      success: true,
      moduleId: moduleDoc._id,
      moduleName: moduleDoc.name,
      flowComplete,
      question: formatQuestion(question),
      isReturningUser: state.createdAt < state.updatedAt,
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
  createOrUpdateModule,
  getAllModules,
  startModule,
};
