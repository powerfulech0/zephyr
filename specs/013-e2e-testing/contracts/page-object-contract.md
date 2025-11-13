# Contract: Page Object Model

**Feature**: 013-e2e-testing
**Date**: 2025-11-11
**Purpose**: Define interfaces for page object classes used in E2E tests

## Overview

Page Objects provide abstractions for UI interactions, enabling maintainable and reusable test code. This contract defines the interface each page object must implement.

---

## BasePage Interface

**Path**: `tests/e2e/pages/common/BasePage.js`

### Constructor

```javascript
constructor(page, baseUrl)
```

**Parameters**:
- `page` (Playwright Page): Browser page instance
- `baseUrl` (string): Application base URL

### Core Methods

#### goto(path)

Navigate to a specific path within the application.

```javascript
async goto(path = '/')
```

**Parameters**:
- `path` (string): Path relative to baseUrl (default: '/')

**Returns**: `Promise<void>`

**Example**:
```javascript
await basePage.goto('/host');
```

---

#### waitForLoad()

Wait for page to fully load (DOM, network idle).

```javascript
async waitForLoad(timeout = 30000)
```

**Parameters**:
- `timeout` (number): Maximum wait time in ms (default: 30000)

**Returns**: `Promise<void>`

**Throws**: `TimeoutError` if page doesn't load within timeout

---

#### getTitle()

Get current page title.

```javascript
async getTitle()
```

**Returns**: `Promise<string>` - Page title

---

#### screenshot(name)

Capture screenshot of current page.

```javascript
async screenshot(name)
```

**Parameters**:
- `name` (string): Screenshot filename (without extension)

**Returns**: `Promise<Buffer>` - Screenshot data

**Output**: Saved to `tests/e2e/reports/screenshots/{name}.png`

---

#### waitForSelector(selector, options)

Wait for element to appear.

```javascript
async waitForSelector(selector, options = {})
```

**Parameters**:
- `selector` (string): CSS selector
- `options` (object): Playwright wait options
  - `timeout` (number): Max wait time in ms
  - `state` ('attached' | 'detached' | 'visible' | 'hidden'): Element state to wait for

**Returns**: `Promise<ElementHandle>`

**Throws**: `TimeoutError` if element doesn't appear

---

## HostDashboardPage Interface

**Path**: `tests/e2e/pages/HostDashboardPage.js`

**Extends**: `BasePage`

### Constructor

```javascript
constructor(page, baseUrl)
```

Inherits from BasePage.

### Methods

#### createPoll(question, options)

Fill and submit poll creation form.

```javascript
async createPoll(question, options)
```

**Parameters**:
- `question` (string): Poll question text
- `options` (string[]): Array of 2-5 option texts

**Returns**: `Promise<void>`

**Side Effects**: Creates new poll in backend

**Throws**:
- `Error` if form validation fails
- `TimeoutError` if submission doesn't complete

**Example**:
```javascript
await hostPage.createPoll('Favorite color?', ['Red', 'Blue', 'Green']);
```

---

#### getRoomCode()

Extract displayed room code after poll creation.

```javascript
async getRoomCode()
```

**Returns**: `Promise<string>` - 6-character room code

**Throws**: `Error` if room code element not found

**Example**:
```javascript
const roomCode = await hostPage.getRoomCode();
expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);
```

---

#### openVoting()

Click "Open Voting" button to transition poll to open state.

```javascript
async openVoting()
```

**Returns**: `Promise<void>`

**Side Effects**: Poll state changes to 'open', broadcasts poll-state-changed event

**Throws**: `TimeoutError` if button not found or state doesn't change

---

#### closeVoting()

Click "Close Voting" button to transition poll to closed state.

```javascript
async closeVoting()
```

**Returns**: `Promise<void>`

**Side Effects**: Poll state changes to 'closed', broadcasts poll-state-changed event

**Throws**: `TimeoutError` if button not found or state doesn't change

---

#### getResults()

Extract current vote counts and percentages from results display.

```javascript
async getResults()
```

**Returns**: `Promise<VoteResults>`

```javascript
type VoteResults = {
  [optionText: string]: {
    count: number,
    percentage: number
  }
}
```

**Example**:
```javascript
const results = await hostPage.getResults();
// { "Red": { count: 5, percentage: 50 }, "Blue": { count: 3, percentage: 30 }, ... }
```

---

#### getParticipantCount()

Get number of currently connected participants.

```javascript
async getParticipantCount()
```

**Returns**: `Promise<number>` - Participant count

**Example**:
```javascript
const count = await hostPage.getParticipantCount();
expect(count).toBe(10);
```

---

#### getPollState()

Get current poll state.

```javascript
async getPollState()
```

**Returns**: `Promise<'waiting' | 'open' | 'closed'>`

**Example**:
```javascript
const state = await hostPage.getPollState();
expect(state).toBe('open');
```

---

## JoinPage Interface

**Path**: `tests/e2e/pages/JoinPage.js`

**Extends**: `BasePage`

### Methods

#### joinPoll(roomCode, nickname)

Fill and submit join form.

```javascript
async joinPoll(roomCode, nickname)
```

**Parameters**:
- `roomCode` (string): 6-character room code
- `nickname` (string): Participant nickname (1-50 chars)

**Returns**: `Promise<void>`

**Side Effects**: Creates participant in backend, establishes WebSocket connection

**Throws**:
- `Error` if validation fails
- `TimeoutError` if join doesn't complete

**Example**:
```javascript
await joinPage.joinPoll('ABC123', 'Alice');
```

---

#### getErrorMessage()

Extract error message displayed after failed join attempt.

```javascript
async getErrorMessage()
```

**Returns**: `Promise<string | null>` - Error message or null if no error

**Example**:
```javascript
await joinPage.joinPoll('INVALID', 'Alice');
const error = await joinPage.getErrorMessage();
expect(error).toContain('Poll not found');
```

---

#### isJoinSuccessful()

Check if join was successful (redirected to vote page).

```javascript
async isJoinSuccessful()
```

**Returns**: `Promise<boolean>` - true if on vote page, false otherwise

**Example**:
```javascript
await joinPage.joinPoll('ABC123', 'Alice');
const success = await joinPage.isJoinSuccessful();
expect(success).toBe(true);
```

---

## VotePage Interface

**Path**: `tests/e2e/pages/VotePage.js`

**Extends**: `BasePage`

### Methods

#### getPollQuestion()

Get displayed poll question.

```javascript
async getPollQuestion()
```

**Returns**: `Promise<string>` - Poll question text

---

#### getOptions()

Get list of available voting options.

```javascript
async getOptions()
```

**Returns**: `Promise<string[]>` - Array of option texts

**Example**:
```javascript
const options = await votePage.getOptions();
expect(options).toEqual(['Red', 'Blue', 'Green']);
```

---

#### selectOption(optionText)

Select a voting option (does not submit).

```javascript
async selectOption(optionText)
```

**Parameters**:
- `optionText` (string): Text of option to select

**Returns**: `Promise<void>`

**Throws**: `Error` if option not found

---

#### submitVote()

Click submit button to submit selected vote.

```javascript
async submitVote()
```

**Returns**: `Promise<void>`

**Side Effects**: Creates/updates vote in backend, broadcasts vote-update event

**Throws**: `TimeoutError` if submission doesn't complete

---

#### getConfirmation()

Get vote confirmation message.

```javascript
async getConfirmation()
```

**Returns**: `Promise<string | null>` - Confirmation message or null if not shown

**Example**:
```javascript
await votePage.selectOption('Red');
await votePage.submitVote();
const confirmation = await votePage.getConfirmation();
expect(confirmation).toContain('Vote submitted');
```

---

#### isVotingDisabled()

Check if voting is disabled (poll closed).

```javascript
async isVotingDisabled()
```

**Returns**: `Promise<boolean>` - true if voting controls are disabled

---

#### getCurrentVote()

Get currently selected option.

```javascript
async getCurrentVote()
```

**Returns**: `Promise<string | null>` - Selected option text or null if none

---

#### changeVote(newOptionText)

Change vote to different option and submit.

```javascript
async changeVote(newOptionText)
```

**Parameters**:
- `newOptionText` (string): New option to vote for

**Returns**: `Promise<void>`

**Side Effects**: Updates vote in backend, broadcasts vote-update event

**Example**:
```javascript
await votePage.changeVote('Blue');
const confirmation = await votePage.getConfirmation();
expect(confirmation).toContain('Vote updated');
```

---

## Implementation Requirements

### All Page Objects MUST:

1. **Extend BasePage**: Inherit core functionality
2. **Use Auto-Wait**: Never use fixed `setTimeout()`, always use Playwright's built-in waiting
3. **Descriptive Errors**: Throw descriptive errors with context (which element, what action)
4. **Return Promises**: All async methods return Promises
5. **Idempotent Where Possible**: Methods like `getRoomCode()` should be callable multiple times safely
6. **No Business Logic**: Page objects contain UI interaction logic only, not test assertions

### Naming Conventions:

- **Methods**: Verb-based (`createPoll`, `getRoomCode`, `isVotingDisabled`)
- **Properties**: Noun-based (`roomCode`, `pollState`)
- **Selectors**: Store as class constants (`static ROOM_CODE_SELECTOR = '#room-code'`)

### Error Handling:

```javascript
// Example of descriptive error
async getRoomCode() {
  const element = await this.page.$('#room-code');
  if (!element) {
    throw new Error('Room code element not found. Poll may not have been created successfully.');
  }
  return element.textContent();
}
```

---

## Testing Page Objects

Page objects themselves should have basic smoke tests to validate selectors:

```javascript
// Example: Verify HostDashboardPage selectors exist
test('HostDashboardPage selectors are valid', async ({ page }) => {
  const hostPage = new HostDashboardPage(page, baseUrl);
  await hostPage.goto('/host');

  // Verify critical elements exist
  await expect(page.locator('#poll-question')).toBeVisible();
  await expect(page.locator('#poll-options')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-11 | Initial contract definition |
