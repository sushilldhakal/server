// routes/subscriberRoutes.js
import { Request, Response } from 'express';
import Subscriber from './subscriberModel';


// Subscribe a new email
export const newSubscriber = async (req: Request, res: Response) => {
    const { email } = req.body;
  
    try {
      const existingSubscriber = await Subscriber.findOne({ email });
      if (existingSubscriber) {
        return res.status(400).json({ error: 'Email already subscribed.' });
      }
  
      const newSubscriber = new Subscriber({ email });
      await newSubscriber.save();
      res.status(201).json({ message: 'Subscription successful!' });
    } catch (error) {
      res.status(500).json({ error: 'Server error, please try again later.' });
    }
};


export const getAllSubscribers = async (req: Request, res: Response) => {
    try {
      const subscribers = await Subscriber.find();
      res.status(200).json(subscribers);
    } catch (error) {
      console.error('Error in getAllSubscribers:', error);
      res.status(500).json({ error: 'Server error, please try again later.' });
    }
  };

// Unsubscribe an email
export const unsubscribe = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const existingSubscriber = await Subscriber.findOne({ email });
    if (!existingSubscriber) {
      return res.status(400).json({ error: 'Email not found.' });
    }

    await Subscriber.deleteOne({ email });
    res.status(200).json({ message: 'Unsubscribed successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error, please try again later.' });
  }
};
