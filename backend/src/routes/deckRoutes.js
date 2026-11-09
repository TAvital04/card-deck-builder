const express = require('express');
const { createDeck, getDecks, getDeckById, updateDeck, deleteDeck, exportDeck } = require('../controllers/deckController');
const { protect } = require('../middleware/auth'); // Your Turn 3 middleware

const router = express.Router();

router.use(protect); // All deck routes require authentication
router.route('/').post(createDeck).get(getDecks);
router.route('/:id').get(getDeckById).put(updateDeck).delete(deleteDeck);
router.get('/:id/export', exportDeck);

module.exports = router;