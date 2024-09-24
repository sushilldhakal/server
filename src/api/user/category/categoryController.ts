import { AuthRequest } from './../../../middlewares/authenticate';
import Category from "./categoryModel";
import Tour from "../../tours/tourModel";
import { Request, Response, NextFunction } from 'express';

export const getUserCategories = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;  // Assuming user ID is available in the request
        const userRole = req.roles;  // Assuming user role is available in the request
        let categories;
        if (userRole === 'admin') {
            categories = await Category.find();  // Admin can view all categories
        } else {
            categories = await Category.find({ user: userId });  // Seller can view only their categories
        }
         // Optional: Transform categories if needed
         const transformedCategories = categories.map(category => ({
            id: category._id,
            name: category.name,
            description: category.description,
            imageUrl: category.imageUrl,
            slug: category.slug,
            isActive: category.isActive,
            user: category.user,
        }));
        res.status(200).json(transformedCategories);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch categories' });
    }
};

export const getAllCategories = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        let categories;
            categories = await Category.find();  // Admin can view all categories
        res.status(200).json({categories});
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch categories' });
    }
};

export const getSingleCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { categoryId } = req.params;
    try {
        let categories;
            categories = await Category.findById(categoryId);  // Admin can view all categories
            res.status(200).json({categories});
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch categories' });
    }
};

export const addCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;  // Assuming user ID is available in the request
        const { name, description, imageUrl, isActive } = req.body;

        const newCategory = new Category({
            name,
            description,
            imageUrl,
            isActive,
            slug: name.toLowerCase().replace(/\s+/g, '-'),
            user: userId,
        });

        await newCategory.save();
        res.status(201).json(newCategory);
    } catch (error) {
        res.status(500).json({ message: 'Failed to add category' });
    }
};


export const updateCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;  // Assuming user ID is available in the request
        const { categoryId } = req.params;
        const { name, description, imageUrl } = req.body;
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        if (category.user.toString() !== userId && req.roles !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update this category' });
        }

        category.name = name;
        category.description = description;
        category.imageUrl = imageUrl;
        await category.save();

        res.status(200).json(category);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update category' });
    }
};


export const deleteCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;  // Assuming user ID is available in the request
        const { categoryId } = req.params;
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        if (category.user.toString() !== userId && req.roles !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this category' });
        }

        await Category.findByIdAndDelete(categoryId);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete category' });
    }
};

export const listToursBasedOnCategory = async (req: Request, res: Response, next: NextFunction) => {
    const { categoryId } = req.params; // Assuming categoryId is passed as a route parameter

    try {
        // Validate that the categoryId is a valid ObjectId format
        if (!categoryId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ message: 'Invalid category ID format' });
        }

        // Fetch tours that match the given category ID
        const tours = await Tour.find({ category: categoryId }).exec();

        // Respond with the list of tours
        res.status(200).json(tours);
    } catch (error) {
        // Log the error for debugging purposes
        console.error('Failed to fetch tours:', error);

        // Respond with a 500 status and a message
        res.status(500).json({ message: 'Failed to fetch tours' });
    }
};