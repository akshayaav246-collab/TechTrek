const mongoose = require('mongoose');
const Event = require('./models/Event');
require('dotenv').config();

async function addSpeaker() {
  console.log('Connecting to DB...', process.env.MONGO_URI);
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    // Get the first UPCOMING event
    const event = await Event.findOne();
    if (!event) {
      console.log('No events found');
      process.exit(0);
    }
    
    console.log('Found event:', event.name);
    console.log('Current speakers:', event.speakers.length);
    
    if (event.speakers.length < 4) {
      event.speakers.push({
        _id: new mongoose.Types.ObjectId(),
        name: "Dr. Anita Desai",
        role: "Chief Scientist",
        company: "QuantumCorp",
        bio: "Pioneer in quantum algorithms and cryptographic security.",
        headline: "Quantum Supremacy in India",
        tags: ["#QUANTUM", "#DEEPTECH"],
        date: "Mar 12, 03:30 PM",
        duration: "45 mins"
      });
      
      await event.save();
      console.log(`Successfully added 4th speaker to event: ${event.name}`);
    } else {
      console.log('Event already has 4 or more speakers');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

addSpeaker();
