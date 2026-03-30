const Speaker = require('../models/Speaker');

const normalizeName = (value = '') => value.trim().toLowerCase();

const listSpeakers = async (req, res) => {
  try {
    const filter = req.user.role === 'superAdmin' ? {} : { createdBy: req.user._id };
    const speakers = await Speaker.find(filter).sort({ updatedAt: -1, name: 1 }).lean();
    res.json(speakers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const upsertSpeaker = async (req, res) => {
  try {
    const { name = '', role = '', company = '', bio = '' } = req.body;
    const trimmedName = name.trim();
    if (!trimmedName) {
      return res.status(400).json({ message: 'Speaker name is required' });
    }

    const speaker = await Speaker.findOneAndUpdate(
      { createdBy: req.user._id, normalizedName: normalizeName(trimmedName) },
      {
        $set: {
          name: trimmedName,
          normalizedName: normalizeName(trimmedName),
          role: role.trim(),
          company: company.trim(),
          bio: bio.trim(),
          createdBy: req.user._id,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(speaker);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { listSpeakers, upsertSpeaker, normalizeName };
