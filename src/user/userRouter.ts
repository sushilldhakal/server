import express from "express";
import { getAllUsers, getUserById, createUser, loginUser, updateUser, deleteUser, changeUserRole, authenticateJWT} from "./userController";
import { body, param } from 'express-validator';

const userRouter = express.Router();

//routes
userRouter.post('/register', [
    body('name').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 })
  ], createUser);

userRouter.post('/login', [body('email').isEmail(), body('password').isLength({ min: 6 })], loginUser);

userRouter.get('/all',authenticateJWT, getAllUsers);

userRouter.get('/:id', [param('id').isMongoId(), authenticateJWT], getUserById);

userRouter.put(
    '/:id',
    [
        param('id').isMongoId(),
        body('first_name').optional().notEmpty(),
        body('last_name').optional().notEmpty(),
        body('email').optional().isEmail(),
        body('phone').optional().notEmpty(),
        body('address').optional().notEmpty(),
        body('preferences').optional().notEmpty(),
        authenticateJWT
      ],
    updateUser
  );
  userRouter.delete('/:id',[param('id').isMongoId(), authenticateJWT], deleteUser);

  userRouter.post('/change-role',authenticateJWT, changeUserRole);


export default userRouter;