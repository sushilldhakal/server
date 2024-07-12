import express from "express";
import { getAllUsers, getUserById, createUser, loginUser, updateUser, deleteUser, changeUserRole} from "./userController";
import { body, param } from 'express-validator';
import authenticate from "../middlewares/authenticate";

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

userRouter.put(
    '/:userId',authenticate,updateUser
  );
  userRouter.delete('/:userId',[param('id').isMongoId(), authenticate], deleteUser);

  userRouter.post('/change-role',authenticate, changeUserRole);


export default userRouter;