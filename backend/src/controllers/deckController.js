const Deck = require('../models/Deck'); // Michael's Turn 2 model

async function createDeck(req, res) {
  try {
    const deck = await Deck.create({ ...req.body, user: req.user.id });
    res.status(201).json({ success: true, data: deck });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getDecks(req, res) {
  try {
    const decks = await Deck.find({ user: req.user.id });
    res.status(200).json({ success: true, data: decks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getDeckById(req, res) {
  try {
    const deck = await Deck.findOne({ _id: req.params.id, user: req.user.id });
    if (!deck) return res.status(404).json({ success: false, message: 'Deck not found' });
    res.status(200).json({ success: true, data: deck });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function updateDeck(req, res) {
  try {
    const deck = await Deck.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!deck) return res.status(404).json({ success: false, message: 'Deck not found' });
    res.status(200).json({ success: true, data: deck });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function deleteDeck(req, res) {
  try {
    const deck = await Deck.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!deck) return res.status(404).json({ success: false, message: 'Deck not found' });
    res.status(200).json({ success: true, message: 'Deck deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function exportDeck(req, res) {
  try {
    const deck = await Deck.findOne({ _id: req.params.id, user: req.user.id });
    if (!deck) return res.status(404).json({ success: false, message: 'Deck not found' });
    
    // Simple text export formatting
    const exportText = deck.cards.map(c => `${c.count}x ${c.name}`).join('\n');
    res.status(200).json({ success: true, data: exportText });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { createDeck, getDecks, getDeckById, updateDeck, deleteDeck, exportDeck };