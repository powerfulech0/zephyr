/**
 * @deprecated This class is DEPRECATED as of v2.0.0 (Production-Ready Infrastructure)
 *
 * **Do NOT use PollManager for new code.**
 *
 * # Migration Guide
 *
 * The in-memory PollManager has been replaced with a database-backed repository pattern
 * to support data persistence, horizontal scaling, and production reliability.
 *
 * ## Use Instead:
 *
 * ### For Poll Operations:
 * - `backend/src/services/pollService.js` - Business logic layer
 * - `backend/src/models/repositories/PollRepository.js` - Database operations
 *
 * ### For Participant Operations:
 * - `backend/src/models/repositories/ParticipantRepository.js`
 *
 * ### For Vote Operations:
 * - `backend/src/models/repositories/VoteRepository.js`
 *
 * ## Migration Examples:
 *
 * ### Before (PollManager):
 * ```javascript
 * const pollManager = new PollManager();
 * const poll = pollManager.createPoll(question, options, hostSocketId);
 * const existingPoll = pollManager.getPoll(roomCode);
 * ```
 *
 * ### After (Repository Pattern):
 * ```javascript
 * const pollService = require('../services/pollService');
 * const PollRepository = require('../models/repositories/PollRepository');
 *
 * // Create poll
 * const poll = await pollService.createPoll({ question, options });
 *
 * // Get poll
 * const existingPoll = await PollRepository.getPollByRoomCode(roomCode);
 * ```
 *
 * ## Why This Changed:
 *
 * 1. **Data Persistence**: In-memory storage loses all data on server restart
 * 2. **Horizontal Scaling**: Map-based storage doesn't work across multiple instances
 * 3. **Durability**: No backup/recovery for in-memory data
 * 4. **Production Requirements**: FR-003 requires zero data loss during restarts
 *
 * ## References:
 * - Architecture: `backend/docs/architecture.md`
 * - Data Model: `specs/002-production-ready/data-model.md`
 * - Feature Spec: `specs/002-production-ready/spec.md`
 *
 * ## Note:
 * This file is kept for reference only. It will be removed in a future version.
 * All routes and socket handlers have been migrated to use repositories.
 */

// No implementation - file kept for documentation purposes only
// See migration guide above for new approach

module.exports = null; // Prevent accidental use
