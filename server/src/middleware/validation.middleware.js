import Joi from 'joi';
import loggerObj from '../utils/logger.js';

/**
 * Middleware to validate request data
 * @param {Joi.Schema} schema - Joi schema to validate against
 * @param {string} property - Request property to validate (body, params, query)
 */

const { logger, stream } = loggerObj;

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req[property], {
        abortEarly: false,
        stripUnknown: true
      });

      if (!error) {
        // Replace the request data with the validated data
        req[property] = value;
        logger.debug(`Validation successful for ${property} with value: ${JSON.stringify(value)}`);
        return next();
      }

      const { details } = error;


      const errors = details.map(i => ({
        field: i.path.join('.'),
        message: i.message
      }));

      // Log validation errors
      logger.error(`Validation error on ${property}: ${JSON.stringify(errors)}`);

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    } catch (err) {

      // Log the exception using logger
      logger.error(`Validation middleware error: ${err}`);

      console.error('Validation middleware error:', err);
      return res.status(500).json({
        success: false,
        message: 'Server error during validation'
      });
    }
  };
};

// User validation schemas
const userSchemas = {
  register: Joi.object({

    // username requirements 
    username: Joi.string().min(3).max(20).required()
      .messages({
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 20 characters',
        'any.required': 'Username is required'
      }),

    // email requirements
    email: Joi.string().email().required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),

    // password requirements
    password: Joi.string()
      .min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*]).+$'))
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must include at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'Password is required'
      }),

    // confirm password requirements
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
      .messages({
        'any.only': 'Passwords do not match',
        'any.required': 'Password confirmation is required'
      })
  }),


  login: Joi.object({
    email: Joi.string().email().required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string().required()
      .messages({
        'any.required': 'Password is required'
      })
  }),

  updateProfile: Joi.object({

    // username requirements
    username: Joi.string().min(3).max(20)
      .messages({
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 20 characters'
      }),

    // email requirements
    email: Joi.string().email()
      .messages({
        'string.email': 'Please provide a valid email address'
      }),

    // password requirements
    currentPassword: Joi.string().min(6)
      .messages({
        'string.min': 'Current password must be at least 6 characters long'
      }),

    // confirm password requirements
    newPassword: Joi.string().min(6)
      .messages({
        'string.min': 'New password must be at least 6 characters long'
      }),

    // confirm password requirements
    confirmNewPassword: Joi.string().valid(Joi.ref('newPassword'))
      .messages({
        'any.only': 'New passwords do not match'
      })
  }).with('newPassword', ['currentPassword', 'confirmNewPassword'])
};

// Game validation schemas
const gameSchemas = {
  create: Joi.object({

    name: Joi.string().min(3).max(50).required()
      .messages({
        'string.min': 'Game name must be at least 3 characters long',
        'string.max': 'Game name cannot exceed 50 characters',
        'any.required': 'Game name is required'
      }),

    // maxPlayers requirements
    maxPlayers: Joi.number().integer().min(2).max(20).default(10)
      .messages({
        'number.min': 'Game must have at least 2 players',
        'number.max': 'Game cannot have more than 20 players'
      }),

    // settings requirements
    settings: Joi.object({
      apPerTurn: Joi.number().integer().min(1).max(5).default(1),
      apCostMove: Joi.number().integer().min(1).max(3).default(1),
      apCostShoot: Joi.number().integer().min(1).max(3).default(1),
      apCostUpgrade: Joi.number().integer().min(1).max(5).default(3),
      damagePerShot: Joi.number().integer().min(10).max(50).default(25),
      boardShrinkInterval: Joi.number().integer().min(5).max(30).default(10),
      turnDuration: Joi.number().integer().min(30).max(300).default(60)
    }).default()
  }),


  join: Joi.object({
    gameId: Joi.string().required()
      .messages({
        'any.required': 'Game ID is required'
      })
  }),

  move: Joi.object({
    gameId: Joi.string().required()
      .messages({
        'any.required': 'Game ID is required'
      }),
    x: Joi.number().integer().min(0).required()
      .messages({
        'number.min': 'X coordinate must be non-negative',
        'any.required': 'X coordinate is required'
      }),
    y: Joi.number().integer().min(0).required()
      .messages({
        'number.min': 'Y coordinate must be non-negative',
        'any.required': 'Y coordinate is required'
      })
  }),

  shoot: Joi.object({
    gameId: Joi.string().required()
      .messages({
        'any.required': 'Game ID is required'
      }),
    targetId: Joi.string().required()
      .messages({
        'any.required': 'Target player ID is required'
      })
  }),

  upgrade: Joi.object({
    gameId: Joi.string().required()
      .messages({
        'any.required': 'Game ID is required'
      })
  }),

  trade: Joi.object({
    gameId: Joi.string().required()
      .messages({
        'any.required': 'Game ID is required'
      }),
    targetId: Joi.string().required()
      .messages({
        'any.required': 'Target player ID is required'
      }),
    amount: Joi.number().integer().min(1).required()
      .messages({
        'number.min': 'Trade amount must be at least 1',
        'any.required': 'Trade amount is required'
      })
  }),

  chat: Joi.object({
    gameId: Joi.string().required()
      .messages({
        'any.required': 'Game ID is required'
      }),
    content: Joi.string().required()
      .messages({
        'any.required': 'Message content is required'
      }),
    recipientId: Joi.string(),
    isGlobal: Joi.boolean().default(true)
  })
};

export {
  validate,
  userSchemas,
  gameSchemas
}; 