const express = require('express');

const {
  getCurrentQuestion,
  getHistory,
  goBack,
  submitAnswer,
} = require('../controllers/users');

const router = express.Router();

router.get('/:userId/question', getCurrentQuestion);
router.post('/:userId/answer', submitAnswer);
router.get('/:userId/history', getHistory);
router.post('/:userId/back', goBack);

module.exports = router;
