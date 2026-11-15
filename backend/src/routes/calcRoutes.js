const express = require('express');
const { calculateSingle, calculateCombo } = require('../controllers/calcController');
const router = express.Router();

router.post('/single', calculateSingle);
router.post('/combo', calculateCombo);

module.exports = router;