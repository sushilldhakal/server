import { Request, Response, NextFunction } from 'express';
import Comment from './commentModel';  // Adjust the path as necessary
import Post from './postModel';        // Adjust the path as necessary
import createHttpError from 'http-errors';

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
  try {

    const comments =  await Comment.find().populate('user', 'name email').populate('post', 'id title ');
    res.status(200).json(comments);
  } catch (err) {
    console.error("Error fetching comments:", err);
    next(createHttpError(500, 'Failed to get comments'));
  }
};

export const getUnapprovedCommentsCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  console.log("getUnapprovedCommentsCount")
  try {
    // Count comments where approved is false
    const unapprovedCount = await Comment.countDocuments({ approve: false });
    
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
  
      // Find the comment and remove it
      const comment = await Comment.findByIdAndDelete(commentId);
      if (!comment) {
        return next(createHttpError(404, 'Comment not found'));
      }
  
      // Optionally, update the post to remove the comment reference
      await Post.findByIdAndUpdate(comment.post, { $pull: { comments: commentId } });
  
      res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (err) {
      console.error("Error deleting comment:", err);
      next(createHttpError(500, 'Failed to delete comment'));
    }
  };