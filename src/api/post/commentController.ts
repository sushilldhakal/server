import { Request, Response, NextFunction } from 'express';
import Comment from './commentModel';  // Adjust the path as necessary
import Post from './postModel';        // Adjust the path as necessary
import createHttpError from 'http-errors';
import { AuthRequest } from '../../middlewares/authenticate';

// Create a new comment
export const addComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { post, user, text, likes } = req.body;

    const newComment = new Comment({
      post,
      user,
      text,
      likes,
      approve: false,
    });

    await newComment.save();

    // Optionally, update the post to include the new comment
    await Post.findByIdAndUpdate(post, { $push: { comments: newComment._id } });

    res.status(201).json(newComment);
  } catch (err) {
    console.error("Error adding comment:", err);
    next(createHttpError(500, 'Failed to add comment'));
  }
};

export const editComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { commentId } = req.params; // Get the comment ID from the URL parameters
      const { approve } = req.body;
  
      // Update the comment
      const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        { approve }, // Only update the approve field
        { new: true, runValidators: true } // Return the updated document and run validators
      );
  
      if (!updatedComment) {
        return next(createHttpError(404, 'Comment not found'));
      }
  
      res.status(200).json(updatedComment);
    } catch (err) {
      console.error("Error editing comment:", err);
      next(createHttpError(500, 'Failed to edit comment'));
    }
  };

// Get comments for a specific post
export const getCommentsByPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { postId } = req.params;

    const comments = await Comment.find({ post: postId }).populate('user', 'name email');
    res.status(200).json(comments);
  } catch (err) {
    console.error("Error fetching comments:", err);
    next(createHttpError(500, 'Failed to get comments'));
  }
};

export const getAllComments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const _req = req as AuthRequest;
  try {
    // Get pagination parameters from query
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    let query;
    let totalComments: number;

    if (_req.roles === 'admin') {
      // Admin can see all comments
      query = Comment.find();
      totalComments = await Comment.countDocuments();
    } else {
      // For sellers, first get all their posts
      const sellerPosts = await Post.find({ author: _req.userId });
      const postIds = sellerPosts.map(post => post._id);
      // Then get comments for those posts
      query = Comment.find({ post: { $in: postIds } });
      totalComments = await Comment.countDocuments({ post: { $in: postIds } });
    }

    // Apply pagination and populate fields
    const comments = await query
      .populate('user', 'name email')
      .populate('post', 'title author')
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(skip)
      .limit(limit)
      .lean();

      console.log("comments", comments)

    res.status(200).json({
      success: true,
      data: {
        comments,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalComments / limit),
          totalItems: totalComments,
          itemsPerPage: limit
        }
      }
    });
  } catch (err) {
    console.error("Error fetching comments:", err);
    next(createHttpError(500, 'Failed to get comments'));
  }
};
export const getUnapprovedCommentsCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const _req = req as AuthRequest;
  console.log("getUnapprovedCommentsCount")
  try {
    let unapprovedCount;

    if (_req.roles === 'admin') {
      // Admin counts all unapproved comments
      unapprovedCount = await Comment.countDocuments({ approve: false });
    } else {
      // Sellers count unapproved comments on their posts
      const sellerPosts = await Post.find({ author: _req.userId });
      const postIds = sellerPosts.map(post => post._id);

      unapprovedCount = await Comment.countDocuments({ approve: false, post: { $in: postIds } });
    }
    
    // Send the count as response
    res.status(200).json({ unapprovedCount });
  } catch (err) {
    console.error("Error fetching unapproved comments count:", err);
    next(createHttpError(500, 'Failed to get unapproved comments count'));
  }
};

// Delete a comment
export const deleteComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { commentId } = req.params; // Assuming the comment ID is passed as a URL parameter

       // Split the string to get an array of comment IDs
    const idsArray = commentId.split(',').map(id => id.trim());
  
    // Iterate over the array and delete each comment
    const deleteOperations = idsArray.map(async (commentId) => {
      const comment = await Comment.findByIdAndDelete(commentId);
      if (comment) {
        // Optionally, update the post to remove the comment reference
        await Post.findByIdAndUpdate(comment.post, { $pull: { comments: commentId } });
      }
    });

    // Wait for all deletion operations to complete
    await Promise.all(deleteOperations);
  
      res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (err) {
      console.error("Error deleting comment:", err);
      next(createHttpError(500, 'Failed to delete comment'));
    }
  };