const validatePollCreation = (req, res, next) => {
  const { question, options } = req.body;

  if (typeof question !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Question is required and must be a string',
    });
  }

  if (question.trim().length < 5 || question.length > 200) {
    return res.status(400).json({
      success: false,
      error: 'Question must be between 5 and 200 characters',
    });
  }

  if (!Array.isArray(options)) {
    return res.status(400).json({
      success: false,
      error: 'Options must be an array',
    });
  }

  if (options.length < 2 || options.length > 5) {
    return res.status(400).json({
      success: false,
      error: 'Options array must contain 2-5 elements',
    });
  }

  // eslint-disable-next-line no-restricted-syntax
  for (const option of options) {
    if (typeof option !== 'string' || option.trim().length < 1 || option.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Option must be between 1 and 100 characters',
      });
    }
  }

  return next();
};

const validateRoomCode = (req, res, next) => {
  const { roomCode } = req.params;

  if (!roomCode) {
    return res.status(400).json({
      success: false,
      error: 'Room code is required',
    });
  }

  if (roomCode.length !== 6) {
    return res.status(400).json({
      success: false,
      error: 'Room code must be exactly 6 characters',
    });
  }

  if (!/^[2-9A-HJ-NP-Z]{6}$/.test(roomCode)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid room code format',
    });
  }

  return next();
};

module.exports = {
  validatePollCreation,
  validateRoomCode,
};
