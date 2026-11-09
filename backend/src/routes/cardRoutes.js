const express = require('express');
const { searchCards } = require('../controllers/cardController');
const router = express.Router();

router.get('/search', searchCards);

module.exports = router;