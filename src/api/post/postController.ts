import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import Post, { IPost } from './postModel';  // Assuming Post model is in models folder
import createHttpError from 'http-errors';
import { AuthRequest } from '../../middlewares/authenticate';
import Comment from './commentModel';  // Adjust the path
import { paginate, PaginationParams } from '../../utils/pagination';

// Add a new post
export const addPost = async (req: Request,
    res: Response,
    next: NextFunction): Promise<void> => {
  try {
    const _req = req as AuthRequest;
    const { title, content, tags, image, status, enableComments } = req.body;
      // Check if the user has the required role
      const userRole = _req.roles; // Assuming role is stored on the user object
      // if (userRole !== 'seller' && userRole !== 'admin') {
      //   res.status(403).json({ message: 'Access denied: Unauthorized role' });
      //   return;
      // }

     // Parse the tags string into an array
     const parsedTags = JSON.parse(tags); 
    
    // Ensure that content is a string (stringified JSON)
    const parsedContent = typeof content === 'object' ? JSON.stringify(content) : content;

    const newPost = new Post({
      title,
      content: parsedContent,
      author: _req.userId,  // Convert author to ObjectId
      tags: parsedTags,
      enableComments: enableComments,
      image,
      status,
    });
    const savedPost = await newPost.save();
    res.status(201).json({
      message: 'Post created successfully',
      post: savedPost,
    });
  } catch (err) {
    console.error(err);  // Log error for debugging
    next(createHttpError(500, 'Failed to add post'));
  }
};
// Get all posts with optional pagination, sorting, and filtering
export const getAllPosts = async (req: Request,
  res: Response,
  next: NextFunction): Promise<void> => {
    try {
      const paginationParams: PaginationParams = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        search: req.query.search as string
      };
  
      const { page, limit, totalPages, totalItems, items } = await paginate<IPost>(Post, {}, paginationParams);
      
      // Fetch posts with populated author details
      const posts = await Post.find({}).populate('author', 'name');

          res.status(200).json({
            page,
            limit,
            totalPages,
            totalItems,
            posts: posts.map(post => ({
                ...post.toObject(),
                author: post.author // Include author's name
            })),
        });
    }catch (err) {
      console.error('Error fetching posts:', err);
      next(createHttpError(500, 'Failed to get posts'));
    }
};


export const getAllUserPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const _req = req as AuthRequest; // Assuming `userId` and `role` are available in _req
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search } = req.query;

    // Pagination
    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);

    // Sorting order
    const sort: { [key: string]: 1 | -1 } = { [sortBy as string]: sortOrder === 'desc' ? -1 : 1 };

    // Build query based on role and search filter
    const query: any = {};

    // If user is not admin, only show their own posts
    if (_req.roles !== 'admin') {
      query.author = _req.userId;
    }

    // Apply search filtering
    if (search) {
      query.title = { $regex: search, $options: 'i' };  // Case-insensitive search by title
    }

    // Fetching posts with pagination, sorting, and filtering
    const posts = await Post.find(query)
      .sort(sort)
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .populate("author", "name")
      .populate("comments");

    // Getting total count for pagination
    const totalPosts = await Post.countDocuments(query);

    res.status(200).json({
      page: pageNumber,
      limit: pageSize,
      totalPages: Math.ceil(totalPosts / pageSize),
      totalPosts,
      posts,
    });
  } catch (err) {
    console.error("Error fetching posts:", err);
    next(createHttpError(500, 'Failed to get posts'));
  }
};





// Get a specific post by ID
export const getPost = async (req: Request,
  res: Response,
  next: NextFunction): Promise<void> => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId).populate("author", "name").populate('comments');
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    const breadcrumbs = [
      {
        label: post.title, // Use tour title for breadcrumb label
        url: `/${postId}`, // Example URL
      }
    ];
    if (!breadcrumbs.length) {
      return next(createHttpError(404, 'Failed to get breadcrumbs'));
    }
    res.status(200).json({ post,  breadcrumbs});
  } catch (err) {
    next(createHttpError(500, 'Failed to get post'));
  }
};


export const getUserPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const _req = req as AuthRequest; // Assuming `userId` and `role` are available in _req
    const { postId } = req.params;

    // Fetch the post by ID
    let post;
    if (_req.roles === 'admin') {
      // If the user is an admin, they can access any post
      post = await Post.findById(postId).populate("author", "name").populate("comments");
    } else {
      // If the user is not an admin, only fetch the post if they are the author
      post = await Post.findOne({ _id: postId, author: _req.userId }).populate("author", "name").populate("comments");
    }

    // If no post is found, return 404
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    // Build breadcrumbs
    const breadcrumbs = [
      {
        label: post.title, // Use post title for breadcrumb label
        url: `/${postId}`, // Example URL
      }
    ];

    if (!breadcrumbs.length) {
      return next(createHttpError(404, 'Failed to get breadcrumbs'));
    }

    // Send the post and breadcrumbs in the response
    res.status(200).json({ post, breadcrumbs });
  } catch (err) {
    // Log and return a 500 error
    console.error("Error getting post:", err);
    next(createHttpError(500, 'Failed to get post'));
  }
};




// Delete a post by ID
export const deletePost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const _req = req as AuthRequest; // Assume user information (including role) is available in _req
    const { postId } = req.params;

    // Find the post by ID
    const post = await Post.findById(postId);

    // If the post doesn't exist, return a 404 error
    if (!post) {
       res.status(404).json({ message: 'Post not found' });
       return;
    }

    // Check if the current user is the owner of the post or an admin
    if (post.author.toString() !== _req.userId && _req.roles !== 'admin') {
       res.status(403).json({ message: 'You are not authorized to delete this post' });
       return;
    }

    // Delete the post
    await post.deleteOne();

    // Successfully deleted
    res.status(200).json({
      message: 'Post deleted successfully',
      post,
    });
  } catch (err) {
    // Log the error for debugging
    console.error("Error deleting post:", err);
    // Return a 500 error with a custom message
    next(createHttpError(500, 'Failed to delete post'));
  }
};

// Edit a post using PATCH
export const editPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const _req = req as AuthRequest; // Assume user info (including role) is available in _req
    const { postId } = req.params;
    const updates = req.body;

    // Fetch the post by ID to verify the owner
    const post = await Post.findById(postId);

    // If the post doesn't exist, return a 404 error
    if (!post) {
       res.status(404).json({ message: 'Post not found' });
       return;
    }

    // Check if the current user is the owner of the post or an admin
    if (post.author.toString() !== _req.userId && _req.roles !== 'admin') {
       res.status(403).json({ message: 'You are not authorized to edit this post' });
       return;
    }

    // Update the post if authorized
    const updatedPost = await Post.findByIdAndUpdate(postId, updates, {
      new: true,  // Return the updated document
      runValidators: true,  // Ensure validators are run
    });

    res.status(200).json({
      message: 'Post updated successfully',
      post: updatedPost,
    });
  } catch (err) {
    // Log and return a 500 error
    console.error("Error editing post:", err);
    next(createHttpError(500, 'Failed to edit post'));
  }
};
