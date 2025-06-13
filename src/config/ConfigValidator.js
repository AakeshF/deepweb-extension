/**
 * Configuration Validator
 * Validates configuration against schema
 */

export class ConfigValidator {
  constructor(schema) {
    this.schema = schema;
  }

  /**
   * Validate entire configuration
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result
   */
  validate(config) {
    const errors = [];
    this._validateObject(config, this.schema, '', errors);
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate a specific path
   * @param {string} path - Dot notation path
   * @param {*} value - Value to validate
   * @returns {Object} Validation result
   */
  validatePath(path, value) {
    const schemaPath = this._getSchemaForPath(path);
    if (!schemaPath) {
      return {
        valid: false,
        errors: [`Unknown configuration path: ${path}`]
      };
    }
    
    const errors = [];
    this._validateValue(value, schemaPath, path, errors);
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get schema for a specific path
   * @private
   */
  _getSchemaForPath(path) {
    const parts = path.split('.');
    let current = this.schema;
    
    for (const part of parts) {
      if (current.type === 'object' && current.properties && current.properties[part]) {
        current = current.properties[part];
      } else if (current.type === 'object' && current.additionalProperties) {
        current = current.additionalProperties;
      } else {
        return null;
      }
    }
    
    return current;
  }

  /**
   * Validate an object
   * @private
   */
  _validateObject(obj, schema, path, errors) {
    if (!obj || typeof obj !== 'object') {
      errors.push(`${path || 'root'}: Expected object, got ${typeof obj}`);
      return;
    }
    
    // Check required properties
    if (schema.properties) {
      Object.keys(schema.properties).forEach(key => {
        const propSchema = schema.properties[key];
        const propPath = path ? `${path}.${key}` : key;
        
        if (propSchema.required && !(key in obj)) {
          errors.push(`${propPath}: Required property missing`);
        } else if (key in obj) {
          this._validateValue(obj[key], propSchema, propPath, errors);
        }
      });
    }
    
    // Check for additional properties
    if (!schema.additionalProperties) {
      const allowedKeys = Object.keys(schema.properties || {});
      Object.keys(obj).forEach(key => {
        if (!allowedKeys.includes(key)) {
          const propPath = path ? `${path}.${key}` : key;
          errors.push(`${propPath}: Unknown property`);
        }
      });
    } else if (typeof schema.additionalProperties === 'object') {
      // Validate additional properties against schema
      Object.keys(obj).forEach(key => {
        if (!schema.properties || !(key in schema.properties)) {
          const propPath = path ? `${path}.${key}` : key;
          this._validateValue(obj[key], schema.additionalProperties, propPath, errors);
        }
      });
    }
  }

  /**
   * Validate a value against schema
   * @private
   */
  _validateValue(value, schema, path, errors) {
    // Check type
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (schema.type && actualType !== schema.type) {
      errors.push(`${path}: Expected ${schema.type}, got ${actualType}`);
      return;
    }
    
    // Type-specific validation
    switch (schema.type) {
      case 'object':
        this._validateObject(value, schema, path, errors);
        break;
        
      case 'array':
        this._validateArray(value, schema, path, errors);
        break;
        
      case 'string':
        this._validateString(value, schema, path, errors);
        break;
        
      case 'number':
        this._validateNumber(value, schema, path, errors);
        break;
        
      case 'boolean':
        // Boolean type check is sufficient
        break;
        
      default:
        if (schema.type) {
          errors.push(`${path}: Unknown type ${schema.type}`);
        }
    }
  }

  /**
   * Validate array
   * @private
   */
  _validateArray(arr, schema, path, errors) {
    if (!Array.isArray(arr)) {
      errors.push(`${path}: Expected array`);
      return;
    }
    
    // Validate items
    if (schema.items) {
      arr.forEach((item, index) => {
        this._validateValue(item, schema.items, `${path}[${index}]`, errors);
      });
    }
    
    // Check min/max items
    if (schema.minItems !== undefined && arr.length < schema.minItems) {
      errors.push(`${path}: Array must have at least ${schema.minItems} items`);
    }
    if (schema.maxItems !== undefined && arr.length > schema.maxItems) {
      errors.push(`${path}: Array must have at most ${schema.maxItems} items`);
    }
  }

  /**
   * Validate string
   * @private
   */
  _validateString(str, schema, path, errors) {
    if (typeof str !== 'string') {
      errors.push(`${path}: Expected string`);
      return;
    }
    
    // Check pattern
    if (schema.pattern) {
      const regex = schema.pattern instanceof RegExp 
        ? schema.pattern 
        : new RegExp(schema.pattern);
        
      if (!regex.test(str)) {
        errors.push(`${path}: String does not match pattern ${schema.pattern}`);
      }
    }
    
    // Check enum
    if (schema.enum && !schema.enum.includes(str)) {
      errors.push(`${path}: Value must be one of: ${schema.enum.join(', ')}`);
    }
    
    // Check length
    if (schema.minLength !== undefined && str.length < schema.minLength) {
      errors.push(`${path}: String must be at least ${schema.minLength} characters`);
    }
    if (schema.maxLength !== undefined && str.length > schema.maxLength) {
      errors.push(`${path}: String must be at most ${schema.maxLength} characters`);
    }
  }

  /**
   * Validate number
   * @private
   */
  _validateNumber(num, schema, path, errors) {
    if (typeof num !== 'number' || isNaN(num)) {
      errors.push(`${path}: Expected number`);
      return;
    }
    
    // Check min/max
    if (schema.min !== undefined && num < schema.min) {
      errors.push(`${path}: Number must be at least ${schema.min}`);
    }
    if (schema.max !== undefined && num > schema.max) {
      errors.push(`${path}: Number must be at most ${schema.max}`);
    }
    
    // Check integer
    if (schema.integer && !Number.isInteger(num)) {
      errors.push(`${path}: Number must be an integer`);
    }
  }
}