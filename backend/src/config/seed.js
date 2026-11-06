const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Deck = require('../models/Deck');
require('dotenv').config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/deckbuilder');
    console.log('Connected to MongoDB');

    // Clear existing
    await User.deleteMany({});
    await Deck.deleteMany({});

    // Create demo user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const demoUser = await User.create({
      name: 'Demo User',
      email: 'demouser@ucf.edu',
      password: hashedPassword,
      isVerified: true,
    });

    console.log('Demo user created');

    // Branded Despia (Yu-Gi-Oh! 40 cards)
    const brandedDespiaCards = [
      { name: 'Aluber the Jester of Despia', count: 3, role: 'Starter', category: 'Monster' },
      { name: 'Fallen of Albaz', count: 3, role: 'Starter', category: 'Monster' },
      { name: 'Despian Tragedy', count: 3, role: 'Extender', category: 'Monster' },
      { name: 'Branded Opening', count: 3, role: 'Starter', category: 'Spell' },
      { name: 'Branded Fusion', count: 3, role: 'Starter', category: 'Spell' },
      { name: 'Branded in Red', count: 2, role: 'Extender', category: 'Spell' },
      { name: 'Despia, Theater of the Branded', count: 1, role: 'Extender', category: 'Spell' },
      { name: 'Ash Blossom & Joyous Spring', count: 3, role: 'Hand Trap', category: 'Monster' },
      { name: 'Infinite Impermanence', count: 3, role: 'Hand Trap', category: 'Trap' },
      { name: 'Called by the Grave', count: 2, role: 'Hand Trap', category: 'Spell' },
      { name: 'Mirrorjade the Iceblade Dragon', count: 2, role: 'Boss', category: 'Monster' },
      { name: 'Lubellion the Searing Dragon', count: 1, role: 'Boss', category: 'Monster' },
      { name: 'Albion the Branded Dragon', count: 2, role: 'Boss', category: 'Monster' },
      { name: 'Masquerade the Blazing Dragon', count: 1, role: 'Boss', category: 'Monster' },
      { name: 'Branded Retribution', count: 1, role: 'Extender', category: 'Trap' },
      { name: 'Dramatic Snake-Eye', count: 1, role: 'Extender', category: 'Monster' },
      { name: 'Ad Libitum of Despia', count: 1, role: 'Extender', category: 'Monster' },
      { name: 'The Bystial Lubellion', count: 1, role: 'Extender', category: 'Monster' },
      { name: 'Bystial Magnamhut', count: 1, role: 'Extender', category: 'Monster' },
      { name: 'Bystial Saronir', count: 1, role: 'Extender', category: 'Monster' },
      { name: 'Branded Lost', count: 1, role: 'Extender', category: 'Spell' },
    ];

    await Deck.create({
      name: 'Branded Despia',
      game: 'Yu-Gi-Oh!',
      user: demoUser._id,
      cards: brandedDespiaCards,
    });

    console.log('Branded Despia deck created');

    // Mono Red Aggro (MTG 60 cards)
    const monoRedCards = [
      { name: 'Monastery Swiftspear', count: 4, role: 'Starter', category: 'Creature' },
      { name: 'Kumano Faces Kakkazan', count: 4, role: 'Starter', category: 'Creature' },
      { name: 'Play with Fire', count: 4, role: 'Removal', category: 'Instant' },
      { name: 'Lightning Strike', count: 4, role: 'Removal', category: 'Instant' },
      { name: 'Searing Blood', count: 2, role: 'Removal', category: 'Instant' },
      { name: 'Embercleave', count: 2, role: 'Finisher', category: 'Artifact' },
      { name: 'Bonecrusher Giant', count: 4, role: 'Extender', category: 'Creature' },
      { name: 'Phoenix Chick', count: 4, role: 'Starter', category: 'Creature' },
      { name: 'Mountain', count: 20, role: 'Land', category: 'Land' },
      { name: 'Den of the Bugbear', count: 4, role: 'Land', category: 'Land' },
      { name: 'Sokenzan, Crucible of Defiance', count: 2, role: 'Land', category: 'Land' },
      { name: 'Fable of the Mirror-Breaker', count: 2, role: 'Extender', category: 'Enchantment' },
      { name: 'Reckless Impulse', count: 2, role: 'Draw', category: 'Sorcery' },
      { name: 'Thundering Raiju', count: 2, role: 'Finisher', category: 'Creature' },
    ];

    await Deck.create({
      name: 'Mono Red Aggro',
      game: 'MTG',
      user: demoUser._id,
      cards: monoRedCards,
    });

    console.log('Mono Red Aggro deck created');
    console.log('Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();