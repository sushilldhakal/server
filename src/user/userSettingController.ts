import { AuthRequest } from './../middlewares/authenticate';
import { Request, Response, NextFunction } from 'express';
import UserSettings from './userSettingModel';

export const addOrUpdateSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {

  const { userId } = req.params;
  const {  CLOUDINARY_CLOUD, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, OPENAI_API_KEY } = req.body;
    try {
        let settings = await UserSettings.findOne({ user: userId });

        if (!settings) {
            // Create new settings if none exist
            settings = new UserSettings({
              user: userId,
              cloudinaryCloud: CLOUDINARY_CLOUD,
              cloudinaryApiKey: CLOUDINARY_API_KEY,
              cloudinaryApiSecret: CLOUDINARY_API_SECRET,
              openaiApiKey: OPENAI_API_KEY,
            });
        } else {
          if (CLOUDINARY_CLOUD !== undefined) settings.cloudinaryCloud = CLOUDINARY_CLOUD;
          if (CLOUDINARY_API_KEY !== undefined) settings.cloudinaryApiKey = CLOUDINARY_API_KEY;
          if (CLOUDINARY_API_SECRET !== undefined) settings.cloudinaryApiSecret = CLOUDINARY_API_SECRET;
          if (OPENAI_API_KEY !== undefined) settings.openaiApiKey = OPENAI_API_KEY;
        }

        await settings.save();
        res.status(200).json({ message: 'Settings saved successfully', settings });
    } catch (error) {
        next(error);
    }
};


export const getUserSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
  
      const settings = await UserSettings.findOne({ user: userId });
      
      if (!settings) {
        return res.status(404).json({ message: 'Please add values to the field' });
      }
  
      res.status(200).json(settings);
    } catch (error) {
      next(error);
    }
  };