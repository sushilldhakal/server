import { addOrUpdateSettings, getDecryptedApiKey, getUserSettings } from './userSettingController';
import express from "express";
import { 
  getAllUsers, 
  getUserById, 
  createUser, 
  loginUser, 
  updateUser, 
  deleteUser, 
  changeUserRole, 
  verifyUser, 
  forgotPassword, 
  resetPassword,
  approveSellerApplication
} from "./userController";
import { uploadAvatar, getUserAvatar } from './userAvatarController';
import { body, param } from 'express-validator';
import {authenticate, isAdminOrSeller} from "../../middlewares/authenticate";
import { upload, uploadNone, uploadAvatar as uploadAvatarMiddleware } from '../../middlewares/multer';

const userRouter = express.Router();

//routes
userRouter.post('/register', [
    body('name').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 })
  ], createUser);

userRouter.post('/login', [body('email').isEmail(), body('password').isLength({ min: 6 })], loginUser);

userRouter.get('/all',authenticate, getAllUsers);

userRouter.get('/:userId', [param('userId').isMongoId(), authenticate], getUserById);



userRouter.patch(
  '/setting/:userId', uploadNone, authenticate as any, isAdminOrSeller as any, addOrUpdateSettings as any
);
userRouter.get('/setting/:userId', authenticate, isAdminOrSeller as any, getUserSettings);
// Add route for getting decrypted API keys
userRouter.get('/setting/:userId/key', authenticate as any, isAdminOrSeller as any, getDecryptedApiKey as any);

userRouter.patch(
    '/:userId',authenticate,updateUser
  );

userRouter.delete('/:userId',[param('id').isMongoId(), authenticate], deleteUser);

userRouter.post('/change-role',authenticate, changeUserRole);

// New route for approving seller applications (admin only)
userRouter.post('/:userId/approve-seller', [param('userId').isMongoId(), authenticate], approveSellerApplication);

userRouter.post('/login/verify',[
  body('token').notEmpty()
], verifyUser);

userRouter.post('/login/forgot', forgotPassword);

userRouter.post('/login/reset', resetPassword);

// Avatar routes
userRouter.post('/:userId/avatar', authenticate, uploadAvatarMiddleware, uploadAvatar);
userRouter.get('/:userId/avatar', authenticate, getUserAvatar);

export default userRouter;