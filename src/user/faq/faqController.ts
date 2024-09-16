import { AuthRequest } from './../../middlewares/authenticate';
import Faqs from './faqModel';
import { Response, Request, NextFunction } from 'express';



export const getUserFaqs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;  // Assuming user ID is available in the request
        const userRole = req.roles;  // Assuming user role is available in the request
        let faqs;
        if (userRole === 'admin') {
            faqs = await Faqs.find();  // Admin can view all faqs
        } else {
            faqs = await Faqs.find({ user: userId });  // Seller can view only their faqs
        }
         // Optional: Transform faqs if needed
         const transformedFaqs = faqs.map(faq => ({
            id: faq._id,
            question: faq.question,
            answer: faq.answer,
            user: faq.user,
        }));
        res.status(200).json(transformedFaqs);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch faqs' });
    }
};

export const getAllFaqs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        let faqs;
            faqs = await Faqs.find();  // Admin can view all faqs
        res.status(200).json({faqs});
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch faqs' });
    }
};

export const getSingleFaqs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { faqId } = req.params;
    
    try {
        let faqs;
            faqs = await Faqs.findById(faqId);  // Admin can view all faqs
            res.status(200).json({faqs});
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch faqs' });
    }
};

export const addFaqs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;  // Assuming user ID is available in the request
        const { question,
            answer } = req.body;

        const newFaqs = new Faqs({
            question,
            answer,
            user: userId,
        });

        await newFaqs.save();
        res.status(201).json(newFaqs);
    } catch (error) {
        res.status(500).json({ message: 'Failed to add faqs' });
    }
};


export const updateFaqs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;  // Assuming user ID is available in the request
        const { faqId } = req.params;
        const { question, answer } = req.body;
        const faqs = await Faqs.findById(faqId);
        if (!faqs) {
            return res.status(404).json({ message: 'Fact not found' });
        }

        if (faqs.user.toString() !== userId && req.roles !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update this Fact' });
        }

        faqs.question = question;
        faqs.answer = answer;
        await faqs.save();

        res.status(200).json(faqs);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update Fact' });
    }
};


export const deleteFaqs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;  // Assuming user ID is available in the request
        const { faqsId } = req.params;
        const faqs = await Faqs.findById(faqsId);
        if (!faqs) {
            return res.status(404).json({ message: 'Faqs not found' });
        }

        if (faqs.user.toString() !== userId && req.roles !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this faqs' });
        }

        await Faqs.findByIdAndDelete(faqsId);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete faqs' });
    }
};