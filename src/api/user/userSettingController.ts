import { AuthRequest } from './../../middlewares/authenticate';
import { Request, Response, NextFunction } from 'express';
import UserSettings from './userSettingModel';
import { encrypt, decrypt } from '../../utils/encryption';

export const addOrUpdateSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {

  const { userId } = req.params;
  const {  CLOUDINARY_CLOUD, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, OPENAI_API_KEY, GOOGLE_API_KEY } = req.body;
    try {
        let settings = await UserSettings.findOne({ user: userId });

        if (!settings) {
            // Create new settings if none exist
            settings = new UserSettings({
              user: userId,
              cloudinaryCloud: CLOUDINARY_CLOUD,
              cloudinaryApiKey: CLOUDINARY_API_KEY ? encrypt(CLOUDINARY_API_KEY) : '',
              cloudinaryApiSecret: CLOUDINARY_API_SECRET ? encrypt(CLOUDINARY_API_SECRET) : '',
              openaiApiKey: OPENAI_API_KEY ? encrypt(OPENAI_API_KEY) : '',
              googleApiKey: GOOGLE_API_KEY ? encrypt(GOOGLE_API_KEY) : '',
            });
        } else {
          if (CLOUDINARY_CLOUD !== undefined) settings.cloudinaryCloud = CLOUDINARY_CLOUD;
          if (CLOUDINARY_API_KEY !== undefined) settings.cloudinaryApiKey = encrypt(CLOUDINARY_API_KEY);
          if (CLOUDINARY_API_SECRET !== undefined) settings.cloudinaryApiSecret = encrypt(CLOUDINARY_API_SECRET);
          if (OPENAI_API_KEY !== undefined) settings.openaiApiKey = encrypt(OPENAI_API_KEY);
          if (GOOGLE_API_KEY !== undefined) settings.googleApiKey = encrypt(GOOGLE_API_KEY);
        }

        await settings.save();
        
        // Return settings with decrypted values for immediate use
        const responseSettings = {
          ...settings.toObject(),
          cloudinaryApiKey: CLOUDINARY_API_KEY || (settings.cloudinaryApiKey ? '••••••••' : ''),
          cloudinaryApiSecret: CLOUDINARY_API_SECRET || (settings.cloudinaryApiSecret ? '••••••••' : ''),
          openaiApiKey: OPENAI_API_KEY || (settings.openaiApiKey ? '••••••••' : ''),
          googleApiKey: GOOGLE_API_KEY || (settings.googleApiKey ? '••••••••' : '')
        };
        
        res.status(200).json({ message: 'Settings saved successfully', settings: responseSettings });
    } catch (error) {
        next(error);
    }
};


export const getUserSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
  
      const settings = await UserSettings.findOne({ user: userId });
      
      if (!settings) {
        return res.status(404).json({ message: 'Settings not found' });
      }

      // Mask sensitive data in the response
      const responseSettings = {
        ...settings.toObject(),
        cloudinaryApiKey: settings.cloudinaryApiKey ? '••••••••' : '',
        cloudinaryApiSecret: settings.cloudinaryApiSecret ? '••••••••' : '',
        openaiApiKey: settings.openaiApiKey ? '••••••••' : '',
        googleApiKey: settings.googleApiKey ? '••••••••' : ''
      };

      res.status(200).json({ settings: responseSettings });
    } catch (error) {
      next(error);
    }
};

// New method to get decrypted API keys when needed
export const getDecryptedApiKey = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { keyType } = req.query;
    
    // Ensure the requesting user has permission (either admin or the user themselves)
    if (req.userId !== userId && req.roles !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access to API keys' });
    }

    const settings = await UserSettings.findOne({ user: userId });
    if (!settings) {
      return res.status(404).json({ message: 'Settings not found' });
    }

    let decryptedKey = '';
    
    switch(keyType) {
      case 'cloudinary_api_key':
        decryptedKey = decrypt(settings.cloudinaryApiKey || '');
        break;
      case 'cloudinary_api_secret':
        decryptedKey = decrypt(settings.cloudinaryApiSecret || '');
        break;
      case 'openai_api_key':
        decryptedKey = decrypt(settings.openaiApiKey || '');
        break;
      case 'google_api_key':
        decryptedKey = decrypt(settings.googleApiKey || '');
        break;
      default:
        return res.status(400).json({ message: 'Invalid key type requested' });
    }

    res.status(200).json({ key: decryptedKey });
  } catch (error) {
    next(error);
  }
};