import express from 'express';
import { addPost, getPost, deletePost, editPost, getAllPosts, getUserPost, getAllUserPosts } from './postController';
import { authenticate, isAdminOrSeller } from '../../middlewares/authenticate';
import { uploadNone } from '../../middlewares/multer';
import { addComment, deleteComment, editComment, getAllComments, getCommentsByPost, getUnapprovedCommentsCount } from './commentController';

const postRouter = express.Router();

// Post-related routes
postRouter.post('/add',isAdminOrSeller as any, uploadNone, addPost);
postRouter.get('/user', authenticate, getAllUserPosts);  // Fetch all posts
postRouter.get('/:postId', getPost);  // Fetch a single post by ID
postRouter.get('/', getAllPosts);     // Fetch all posts
postRouter.patch('/:postId', authenticate, uploadNone, editPost);  // Edit post
postRouter.delete('/:postId', authenticate, deletePost);  // Delete post

// Comment-related routes
postRouter.post('/comment/:postId', authenticate, addComment); // Add comment to a specific post
postRouter.get('/comment/post/:postId', getCommentsByPost);    // Get comments for a specific post
postRouter.get('/comment/unapproved/count', authenticate, getUnapprovedCommentsCount);
postRouter.get('/comment/post', getAllComments);                    // Get all comments
postRouter.patch('/comment/:commentId', authenticate, editComment); // Edit comment by ID
postRouter.delete('/comment/:commentId', authenticate, deleteComment); // Delete comment by ID

export default postRouter;
