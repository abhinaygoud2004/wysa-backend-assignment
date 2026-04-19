const express = require('express');

const {
  createOrUpdateModule,
  getAllModules,
  startModule,
} = require('../controllers/modules');

const router = express.Router();

router.post('/', createOrUpdateModule);
router.get('/', getAllModules);
router.get('/:moduleId/start', startModule);

module.exports = router;