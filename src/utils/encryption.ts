import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get encryption key from environment variable or use a default (in production, always use env variable)
// Using a fixed default key for development - in production, this should ALWAYS be an environment variable
const DEFAULT_KEY = 'this-is-a-32-char-development-key!';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || DEFAULT_KEY; 
const IV_LENGTH = 16; // For AES, this is always 16 bytes

// Log encryption key status (not the actual key) for debugging
console.log('Encryption key status:', ENCRYPTION_KEY === DEFAULT_KEY ? 'Using default key' : 'Using environment variable');

/**
 * Encrypts text using AES-256-CBC encryption
 * @param text - The text to encrypt
 * @returns The encrypted text as a base64 string with IV prepended
 */
export const encrypt = (text: string): string => {
  if (!text) return '';
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Return IV + encrypted data as a single base64 string
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    return '';
  }
};

/**
 * Decrypts text that was encrypted with the encrypt function
 * @param encryptedText - The encrypted text (IV + encrypted data)
 * @returns The decrypted text
 */
export const decrypt = (encryptedText: string): string => {
  if (!encryptedText) return '';
  
  try {
    const textParts = encryptedText.split(':');
    if (textParts.length !== 2) {
      console.warn('Invalid encrypted text format (missing separator):', encryptedText);
      return '';
    }
    
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedData = textParts[1];
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
};
