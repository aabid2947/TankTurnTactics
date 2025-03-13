import { createClient } from 'redis';
/**
 * Redis client for caching and game data storage using Upstash Redis Cloud
 */
class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Connect to Upstash Redis Cloud
   * @returns {Promise<void>}
   */
  async connect() {
    try {
      // Create Redis client with Upstash configuration
      // Upstash provides a Redis URL in the format: redis://username:password@endpoint:port
      this.client = createClient({
        url: process.env.UPSTASH_REDIS_URL,
        socket: {
          tls: true, // Enable TLS for secure connection to Upstash
          reconnectStrategy: (retries) => {
            // Exponential backoff with max delay of 10 seconds
            const delay = Math.min(Math.pow(2, retries) * 100, 10000);
            console.info(`Redis reconnecting in ${delay}ms...`);
            return delay;
          }
        }
      });

      // Error handling
      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      // Connection events
      this.client.on('connect', () => {
        console.info('Upstash Redis client connecting...');
      });

      this.client.on('ready', () => {
        console.info('Upstash Redis client connected and ready');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        console.warn('Upstash Redis client reconnecting...');
      });

      this.client.on('end', () => {
        console.warn('Upstash Redis client connection closed');
        this.isConnected = false;
      });

      await this.client.connect();
      this.isConnected = true;
      console.log('Connected to Upstash Redis Cloud');
    } catch (error) {
      console.error(`Error connecting to Upstash Redis: ${error.message}`);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Get a value from Redis
   * @param {string} key - Key to get
   * @returns {Promise<any>} - Value from Redis
   */
  async get(key) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis get error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Set a value in Redis
   * @param {string} key - Key to set
   * @param {any} value - Value to set
   * @param {number|null} expiry - Expiry time in seconds (optional)
   * @returns {Promise<string>} - "OK" if successful
   */
  async set(key, value, expiry = null) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      const stringValue = JSON.stringify(value);
      if (expiry) {
        return await this.client.set(key, stringValue, { EX: expiry });
      }
      return await this.client.set(key, stringValue);
    } catch (error) {
      console.error(`Redis set error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete a key from Redis
   * @param {string} key - Key to delete
   * @returns {Promise<number>} - Number of keys deleted
   */
  async del(key) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      return await this.client.del(key);
    } catch (error) {
      console.error(`Redis del error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if a key exists in Redis
   * @param {string} key - Key to check
   * @returns {Promise<boolean>} - True if key exists
   */
  async exists(key) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis exists error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get all keys matching a pattern
   * @param {string} pattern - Pattern to match
   * @returns {Promise<string[]>} - Array of matching keys
   */
  async keys(pattern) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      return await this.client.keys(pattern);
    } catch (error) {
      console.error(`Redis keys error for pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Add a member to a set
   * @param {string} key - Set key
   * @param {string} value - Value to add
   * @returns {Promise<number>} - Number of elements added
   */
  async sadd(key, value) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      return await this.client.sAdd(key, value);
    } catch (error) {
      console.error(`Redis sadd error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get all members of a set
   * @param {string} key - Set key
   * @returns {Promise<string[]>} - Array of set members
   */
  async smembers(key) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      return await this.client.sMembers(key);
    } catch (error) {
      console.error(`Redis smembers error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Remove a member from a set
   * @param {string} key - Set key
   * @param {string} value - Value to remove
   * @returns {Promise<number>} - Number of elements removed
   */
  async srem(key, value) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      return await this.client.sRem(key, value);
    } catch (error) {
      console.error(`Redis srem error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Add a member to a sorted set
   * @param {string} key - Sorted set key
   * @param {number} score - Score for the member
   * @param {string} value - Member value
   * @returns {Promise<number>} - Number of elements added
   */
  async zadd(key, score, value) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      return await this.client.zAdd(key, [{ score, value }]);
    } catch (error) {
      console.error(`Redis zadd error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get members of a sorted set with scores between min and max
   * @param {string} key - Sorted set key
   * @param {number} min - Minimum score
   * @param {number} max - Maximum score
   * @returns {Promise<string[]>} - Array of members
   */
  async zrangebyscore(key, min, max) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      return await this.client.zRangeByScore(key, min, max);
    } catch (error) {
      console.error(`Redis zrangebyscore error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Increment a hash field by a number
   * @param {string} key - Hash key
   * @param {string} field - Hash field
   * @param {number} increment - Increment amount
   * @returns {Promise<number>} - New value
   */
  async hincrby(key, field, increment) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      return await this.client.hIncrBy(key, field, increment);
    } catch (error) {
      console.error(`Redis hincrby error for key ${key}, field ${field}:`, error);
      throw error;
    }
  }

  /**
   * Set a hash field
   * @param {string} key - Hash key
   * @param {string} field - Hash field
   * @param {any} value - Value to set
   * @returns {Promise<number>} - 1 if field is new, 0 if field was updated
   */
  async hset(key, field, value) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : value.toString();
      return await this.client.hSet(key, field, stringValue);
    } catch (error) {
      console.error(`Redis hset error for key ${key}, field ${field}:`, error);
      throw error;
    }
  }

  /**
   * Set multiple hash fields
   * @param {string} key - Hash key
   * @param {Object} fields - Object with field-value pairs
   * @returns {Promise<number>} - Number of fields set
   */
  async hmset(key, fields) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      // Convert object values to strings
      const stringFields = {};
      for (const [field, value] of Object.entries(fields)) {
        stringFields[field] = typeof value === 'object' 
          ? JSON.stringify(value) 
          : value.toString();
      }
      
      return await this.client.hSet(key, stringFields);
    } catch (error) {
      console.error(`Redis hmset error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get a hash field
   * @param {string} key - Hash key
   * @param {string} field - Hash field
   * @returns {Promise<string|null>} - Field value
   */
  async hget(key, field) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      const value = await this.client.hGet(key, field);
      
      if (!value) return null;
      
      // Try to parse as JSON, return as is if not valid JSON
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    } catch (error) {
      console.error(`Redis hget error for key ${key}, field ${field}:`, error);
      throw error;
    }
  }

  /**
   * Get all hash fields and values
   * @param {string} key - Hash key
   * @returns {Promise<Object|null>} - Object with field-value pairs
   */
  async hgetall(key) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      const result = await this.client.hGetAll(key);
      
      if (!result || Object.keys(result).length === 0) {
        return null;
      }
      
      // Try to parse each value as JSON
      const parsedResult = {};
      for (const [field, value] of Object.entries(result)) {
        try {
          parsedResult[field] = JSON.parse(value);
        } catch (e) {
          parsedResult[field] = value;
        }
      }
      
      return parsedResult;
    } catch (error) {
      console.error(`Redis hgetall error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete a hash field
   * @param {string} key - Hash key
   * @param {string} field - Hash field
   * @returns {Promise<number>} - 1 if field was deleted, 0 if field does not exist
   */
  async hdel(key, field) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      return await this.client.hDel(key, field);
    } catch (error) {
      console.error(`Redis hdel error for key ${key}, field ${field}:`, error);
      throw error;
    }
  }

  /**
   * Push a value to the end of a list
   * @param {string} key - List key
   * @param {any} value - Value to push
   * @returns {Promise<number>} - Length of the list after the push
   */
  async rpush(key, value) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : value.toString();
      return await this.client.rPush(key, stringValue);
    } catch (error) {
      console.error(`Redis rpush error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get a range of elements from a list
   * @param {string} key - List key
   * @param {number} start - Start index
   * @param {number} end - End index
   * @returns {Promise<string[]>} - Array of elements
   */
  async lrange(key, start, end) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      const result = await this.client.lRange(key, start, end);
      
      // Try to parse each value as JSON
      return result.map(item => {
        try {
          return JSON.parse(item);
        } catch (e) {
          return item;
        }
      });
    } catch (error) {
      console.error(`Redis lrange error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get the length of a list
   * @param {string} key - List key
   * @returns {Promise<number>} - Length of the list
   */
  async llen(key) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      return await this.client.lLen(key);
    } catch (error) {
      console.error(`Redis llen error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Set a key with an expiry
   * @param {string} key - Key to set
   * @param {number} expiry - Expiry time in seconds
   * @param {any} value - Value to set
   * @returns {Promise<string>} - "OK" if successful
   */
  async setex(key, expiry, value) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : value.toString();
      return await this.client.setEx(key, expiry, stringValue);
    } catch (error) {
      console.error(`Redis setex error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get the time to live for a key
   * @param {string} key - Key to check
   * @returns {Promise<number>} - TTL in seconds, -2 if key does not exist, -1 if key has no expiry
   */
  async ttl(key) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      return await this.client.ttl(key);
    } catch (error) {
      console.error(`Redis ttl error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Publish a message to a channel
   * @param {string} channel - Channel to publish to
   * @param {string} message - Message to publish
   * @returns {Promise<number>} - Number of clients that received the message
   */
  async publish(channel, message) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      const stringMessage = typeof message === 'object' ? JSON.stringify(message) : message.toString();
      return await this.client.publish(channel, stringMessage);
    } catch (error) {
      console.error(`Redis publish error for channel ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to a channel
   * @param {string} channel - Channel to subscribe to
   * @param {Function} callback - Callback function to handle messages
   * @returns {Promise<void>}
   */
  async subscribe(channel, callback) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      // Create a duplicate client for pub/sub (as recommended by Redis)
      const subscriber = this.client.duplicate();
      await subscriber.connect();
      
      await subscriber.subscribe(channel, (message) => {
        try {
          // Try to parse message as JSON
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (e) {
          // If not valid JSON, pass as is
          callback(message);
        }
      });
      
      return subscriber;
    } catch (error) {
      console.error(`Redis subscribe error for channel ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe from a channel
   * @param {string} channel - Channel to unsubscribe from
   * @returns {Promise<void>}
   */
  async unsubscribe(channel) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      await this.client.unsubscribe(channel);
    } catch (error) {
      console.error(`Redis unsubscribe error for channel ${channel}:`, error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const redisClient = new RedisClient();
export default redisClient; 