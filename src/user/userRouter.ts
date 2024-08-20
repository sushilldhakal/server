import { addOrUpdateSettings, getUserSettings } from './userSettingController';
import express from "express";
import { getAllUsers, getUserById, createUser, loginUser, updateUser, deleteUser, changeUserRole, verifyUser, forgotPassword, resetPassword} from "./userController";
import { body, param } from 'express-validator';
import {authenticate, isAdminOrSeller} from "../middlewares/authenticate";
import { upload, uploadNone } from '../middlewares/multer';

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

userRouter.put(
    '/:userId',authenticate,updateUser
  );

  userRouter.delete('/:userId',[param('id').isMongoId(), authenticate], deleteUser);

  userRouter.post('/change-role',authenticate, changeUserRole);

  userRouter.post('/login/verify',[
    body('token').notEmpty()
  ], verifyUser);

  userRouter.post('/login/forgot', forgotPassword);

  userRouter.post('/login/reset', resetPassword);

export default userRouter;