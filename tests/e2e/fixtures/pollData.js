/**
 * Test Data Generators
 *
 * Functions to generate unique test data for polls, participants, and votes.
 * All generated data includes unique identifiers to prevent test collisions.
 */

/**
 * Generate unique poll test data
 * @param {object} overrides - Optional properties to override defaults
 * @param {string} overrides.question - Custom question
 * @param {string[]} overrides.options - Custom options
 * @returns {PollData} Generated poll data
 */
function generatePoll(overrides = {}) {
  const timestamp = Date.now();
  const defaultPoll = {
    question: `Test Poll ${timestamp}`,
    options: ['Option A', 'Option B', 'Option C'],
    createdAt: timestamp,
  };

  return { ...defaultPoll, ...overrides };
}

/**
 * Generate unique participant test data
 * @param {object} overrides - Optional properties to override
 * @param {string} overrides.nickname - Custom nickname
 * @param {string} overrides.roomCode - Poll room code
 * @returns {ParticipantData} Generated participant data
 */
function generateParticipant(overrides = {}) {
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const timestamp = Date.now();

  const defaultParticipant = {
    nickname: `Tester-${randomSuffix}`,
    createdAt: timestamp,
  };

  return { ...defaultParticipant, ...overrides };
}

/**
 * Generate test vote data
 * @param {string[]} options - Available poll options
 * @param {object} overrides - Optional properties to override
 * @param {string} overrides.selectedOption - Specific option to select
 * @param {string} overrides.participantNickname - Voter nickname
 * @returns {VoteData} Generated vote data
 * @throws {Error} If selected option not in available options
 */
function generateVote(options, overrides = {}) {
  const timestamp = Date.now();

  // Randomly select from available options if not specified
  const defaultSelectedOption = options[Math.floor(Math.random() * options.length)];

  const defaultVote = {
    selectedOption: defaultSelectedOption,
    timestamp,
  };

  const vote = { ...defaultVote, ...overrides };

  // Validate selected option exists
  if (!options.includes(vote.selectedOption)) {
    throw new Error(
      `Invalid vote: selectedOption "${vote.selectedOption}" not in available options: ${options.join(', ')}`
    );
  }

  return vote;
}

/**
 * Generate multiple participants
 * @param {number} count - Number of participants to generate
 * @param {object} baseOverrides - Base overrides for all participants
 * @returns {ParticipantData[]} Array of generated participants
 */
function generateMultipleParticipants(count, baseOverrides = {}) {
  const participants = [];
  for (let i = 0; i < count; i++) {
    // Ensure unique nicknames by adding index
    const overrides = {
      ...baseOverrides,
      nickname: baseOverrides.nickname ? `${baseOverrides.nickname}-${i + 1}` : undefined,
    };
    participants.push(generateParticipant(overrides));
  }
  return participants;
}

/**
 * Generate poll with custom number of options
 * @param {number} optionCount - Number of options (2-5)
 * @param {object} overrides - Optional overrides
 * @returns {PollData} Generated poll with specified number of options
 * @throws {Error} If optionCount is not between 2 and 5
 */
function generatePollWithOptions(optionCount, overrides = {}) {
  if (optionCount < 2 || optionCount > 5) {
    throw new Error('Poll must have between 2 and 5 options');
  }

  const options = [];
  for (let i = 0; i < optionCount; i++) {
    options.push(`Option ${String.fromCharCode(65 + i)}`); // A, B, C, D, E
  }

  return generatePoll({ ...overrides, options });
}

module.exports = {
  generatePoll,
  generateParticipant,
  generateVote,
  generateMultipleParticipants,
  generatePollWithOptions,
};

/**
 * @typedef {Object} PollData
 * @property {string} question - Poll question text
 * @property {string[]} options - Array of option texts (2-5)
 * @property {number} createdAt - Timestamp for uniqueness
 * @property {string} [roomCode] - Room code (assigned after creation)
 */

/**
 * @typedef {Object} ParticipantData
 * @property {string} nickname - Participant nickname with unique suffix
 * @property {number} createdAt - Timestamp
 * @property {string} [roomCode] - Poll room code to join
 */

/**
 * @typedef {Object} VoteData
 * @property {string} selectedOption - Selected option text
 * @property {number} timestamp - When vote was cast
 * @property {string} [participantNickname] - Who voted
 */
