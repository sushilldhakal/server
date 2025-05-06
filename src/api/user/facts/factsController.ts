import { AuthRequest } from './../../../middlewares/authenticate';
import Facts from './factsModel';
import { Response, Request, NextFunction } from 'express';



export const getUserFacts = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;  // Assuming user ID is available in the request
        const userRole = req.roles;  // Assuming user role is available in the request
        let facts;
        if (userRole === 'admin') {
            facts = await Facts.find();  // Admin can view all facts
        } else {
            facts = await Facts.find({ user: userId });  // Seller can view only their facts
        }
         // Optional: Transform facts if needed
         const transformedFacts = facts.map(fact => ({
            id: fact._id,
            name: fact.name,
            field_type: fact.field_type,
            value: fact.value,
            icon: fact.icon,
            user: fact.user,
        }));
        res.status(200).json(transformedFacts);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch facts' });
    }
};

export const getAllFacts = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        let facts;
            facts = await Facts.find();  // Admin can view all facts
        res.status(200).json({facts});
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch facts' });
    }
};

export const getSingleFacts = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { factsId } = req.params;
    try {
        let facts;
            facts = await Facts.findById(factsId);  // Admin can view all facts
            res.status(200).json({facts});
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch facts' });
    }
};

export const addFacts = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;  // Assuming user ID is available in the request
        const { name,
            field_type,
            value,
            icon, } = req.body;

            console.log("req.body", req.body)
        const newFacts = new Facts({
            name,
            field_type,
            value,
            icon,
            user: userId,
        });

        await newFacts.save();
        res.status(201).json(newFacts);
    } catch (error) {
        res.status(500).json({ message: 'Failed to add facts' });
    }
};


export const updateFacts = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;  // Assuming user ID is available in the request
        const { factId } = req.params;
        const { name, field_type, value, icon } = req.body;
        console.log("req.body", req.body)
        const facts = await Facts.findById(factId);
        if (!facts) {
            return res.status(404).json({ message: 'Fact not found' });
        }

        if (facts.user.toString() !== userId && req.roles !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update this Fact' });
        }

        facts.name = name;
        facts.field_type = field_type;
        facts.value = value;
        facts.icon = icon;
        await facts.save();

        res.status(200).json(facts);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update Fact' });
    }
};


export const deleteFacts = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;  // Assuming user ID is available in the request
        const { factsId } = req.params;
        const facts = await Facts.findById(factsId);
        if (!facts) {
            return res.status(404).json({ message: 'Facts not found' });
        }

        if (facts.user.toString() !== userId && req.roles !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this facts' });
        }

        await Facts.findByIdAndDelete(factsId);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete facts' });
    }
};