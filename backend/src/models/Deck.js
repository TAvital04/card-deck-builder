const mongoose = require('mongoose');

const CardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  count: { type: Number, default: 1, min: 1 },
  category: String,
  role: String,
  notes: String,
});

const DeckSchema = new mongoose.Schema({
  name: { type: String, required: true },
  game: { type: String, enum: ['Yu-Gi-Oh!', 'MTG'], required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cards: [CardSchema],
}, { timestamps: true });

// Virtual for total card count
DeckSchema.virtual('totalCards').get(function () {
  return this.cards.reduce((sum, card) => sum + card.count, 0);
});

// Text index for search
DeckSchema.index({ name: 'text', 'cards.name': 'text' });

module.exports = mongoose.model('Deck', DeckSchema);