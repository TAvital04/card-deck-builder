const mongoose = require('mongoose');

// Assuming a generic Card model exists or referencing the DB collection directly
const Card = mongoose.models.Card || mongoose.model('Card', new mongoose.Schema({ name: String }, { strict: false }));

async function searchCards(req, res) {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ success: false, message: 'Search query parameter is required.' });
    }

    // Case-insensitive substring regex search
    const cards = await Card.find({ 
      name: { $regex: query, $options: 'i' } 
    }).limit(20);

    return res.status(200).json({ success: true, count: cards.length, data: cards });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { searchCards };