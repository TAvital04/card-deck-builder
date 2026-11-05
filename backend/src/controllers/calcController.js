const { calculateSingleCardProbability, calculateTwoCardComboProbability } = require('../utils/hypergeometric');

function calculateSingle(req, res) {
  try {
    const { deckSize, targetCopies, drawSize, minDesired } = req.body;
    const result = calculateSingleCardProbability(
      Number(deckSize), Number(targetCopies), Number(drawSize), Number(minDesired || 1)
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

function calculateCombo(req, res) {
  try {
    const { deckSize, copiesA, copiesB, drawSize, minA, minB } = req.body;
    const result = calculateTwoCardComboProbability(
      Number(deckSize), Number(copiesA), Number(copiesB), Number(drawSize), Number(minA || 1), Number(minB || 1)
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = { calculateSingle, calculateCombo };