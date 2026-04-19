require('dotenv').config();

const { connectDatabase, disconnectDatabase } = require('../src/db');
const Module = require('../src/models/Module');

const modules = [
  {
    _id: 'mood-check',
    name: 'Mood Check-In',
    entryQuestionId: 'q1',
    questions: [
      {
        id: 'q1',
        text: 'Hi there! How are you feeling today?',
        isCheckpoint: false,
        options: [
          { id: 'q1-a', text: 'Pretty good, thanks', nextQuestionId: 'q3' },
          { id: 'q1-b', text: 'Not great, feeling low', nextQuestionId: 'q2' },
          { id: 'q1-c', text: 'Just okay', nextQuestionId: 'q3' },
        ],
      },
      {
        id: 'q2',
        text: "I'm sorry to hear that. Is there something specific bringing you down?",
        isCheckpoint: false,
        options: [
          { id: 'q2-a', text: 'Work stress', nextQuestionId: 'q3' },
          { id: 'q2-b', text: 'Relationship issues', nextQuestionId: 'q3' },
          { id: 'q2-c', text: 'Not sure, just down', nextQuestionId: 'q3' },
        ],
      },
      {
        id: 'q3',
        text: 'Thank you for sharing. Would you like to talk about how your sleep has been?',
        isCheckpoint: true,
        options: [
          {
            id: 'q3-a',
            text: "Yes, let's talk about sleep",
            nextModuleId: 'sleep-habits',
            nextModuleEntryQuestionId: 'sq1',
          },
          {
            id: 'q3-b',
            text: "No, I'm fine for now",
            nextQuestionId: 'q4',
          },
        ],
      },
      {
        id: 'q4',
        text: "Is there anything else you'd like to talk about today?",
        isCheckpoint: false,
        options: [
          { id: 'q4-a', text: "No, I'm good for now", nextQuestionId: null },
          {
            id: 'q4-b',
            text: "Actually, let's explore sleep",
            nextModuleId: 'sleep-habits',
            nextModuleEntryQuestionId: 'sq1',
          },
        ],
      },
    ],
  },
  {
    _id: 'sleep-habits',
    name: 'Sleep Habits',
    entryQuestionId: 'sq1',
    questions: [
      {
        id: 'sq1',
        text: 'How many hours of sleep do you usually get each night?',
        isCheckpoint: false,
        options: [
          { id: 'sq1-a', text: 'Less than 5 hours', nextQuestionId: 'sq2' },
          { id: 'sq1-b', text: '5-7 hours', nextQuestionId: 'sq2' },
          { id: 'sq1-c', text: '7-9 hours', nextQuestionId: 'sq2' },
          { id: 'sq1-d', text: 'More than 9 hours', nextQuestionId: 'sq2' },
        ],
      },
      {
        id: 'sq2',
        text: 'Do you have trouble falling asleep or staying asleep?',
        isCheckpoint: false,
        options: [
          { id: 'sq2-a', text: 'Trouble falling asleep', nextQuestionId: 'sq3' },
          { id: 'sq2-b', text: 'Trouble staying asleep', nextQuestionId: 'sq3' },
          { id: 'sq2-c', text: 'Both', nextQuestionId: 'sq3' },
          { id: 'sq2-d', text: 'Neither, sleep is fine', nextQuestionId: 'sq3' },
        ],
      },
      {
        id: 'sq3',
        text: 'Thanks for telling me about your sleep. Would you like to continue checking in on your mood?',
        isCheckpoint: true,
        options: [
          {
            id: 'sq3-a',
            text: 'Yes, back to mood check-in',
            nextModuleId: 'mood-check',
            nextModuleEntryQuestionId: 'q4',
          },
          {
            id: 'sq3-b',
            text: "No, I'm done for now",
            nextQuestionId: null,
          },
        ],
      },
    ],
  },
];

async function seedModules() {
  await connectDatabase();
  console.log('Connected to MongoDB');

  for (const moduleDoc of modules) {
    await Module.findByIdAndUpdate(moduleDoc._id, moduleDoc, {
      upsert: true,
      new: true,
      runValidators: true,
    });
    console.log(`Seeded module: ${moduleDoc._id}`);
  }

  await disconnectDatabase();
  console.log('Seed complete');
}

seedModules().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
