import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import bcrypt from "bcrypt";
import userModel from "./userModel";
import jwt from "jsonwebtoken";
import { sign } from "jsonwebtoken";
import { config } from "../config/config";
import { validationResult } from "express-validator";


// Define a custom interface for extending Request
interface AuthenticatedRequest extends Request {
    user?: any; // Add user property of type any (you can refine this type based on your actual User model)
  }

// Generate JWT token
const generateToken = (user: any) => {
    return jwt.sign({ id: user._id, email: user.email }, config.jwtSecret as string, {
      expiresIn: '7d',
    });
  };


    // Middleware to authenticate JWT token
export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
  
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
  
    try {
        const decoded = jwt.verify(token, config.jwtSecret as string) as any;
        req.user = decoded;
        next();
      } catch (err) {
        res.status(400).json({ message: 'Invalid token.' });
      }
  };


// create user
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password } = req.body;

  //validation 
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  if (!name || !email || !password) {
    const error = createHttpError(400, "All fields are required");
    return next(error);
  }

 // Database call.
 try {
    const user = await userModel.findOne({ email });
    if (user) {
      const error = createHttpError(
        400,
        "User already exists with this email."
      );
      return next(error);
    }
  } catch (err) {
    return next(createHttpError(500, "Error while getting user"));
  }

  // Hash password.
  const hashedPassword = await bcrypt.hash(password, 10);
   const newUser= await userModel.create({
      name,
      email,
      password: hashedPassword,
    });
 
  try {
    // Token generation JWT
    const token = sign({ sub: newUser._id }, config.jwtSecret as string, {
      expiresIn: "7d",
      algorithm: "HS256",
    });
    // Response
    res.status(201).json({ accessToken: token });
  } catch (err) {
    return next(createHttpError(500, "Error while signing the jwt token"));
  }
};

// Login a user
export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;
  
    if (!email || !password) {
      return next(createHttpError(400, "All fields are required"));
    }
  
    try {
    const user = await userModel.findOne({ email });
    if (!user) {
      return next(createHttpError(404, "User not found."));
    }
  
    const isMatch = await bcrypt.compare(password, user.password);
  
    if (!isMatch) {
      return next(createHttpError(400, "Username or password incorrect!"));
    }

    // Token generation JWT
    const token = sign({ sub: user._id }, config.jwtSecret as string, {
      expiresIn: "7d",
      algorithm: "HS256",
    });
  
    res.json({ accessToken: token });
} catch (err) {
    return next(createHttpError(500, "Error while logging in user"));
  }
  };


// Get all users
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await userModel.find();
      res.json(users);
    } catch (err) {
      return next(createHttpError(500, "Error while getting users"));
    }
  };


// Get a single user by ID
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await userModel.findById(req.params.id);
      if (user) {
        res.json(user);
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (err) {
        return next(createHttpError(500, "Error while getting user"));
    }
  };

// Update a user by ID
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  
    const { name, email, phone, address, preferences } = req.body;
  
    try {
      const user = await userModel.findById(req.params.id);
      if (user) {
        user.name = name ?? user.name;
        user.email = email ?? user.email;
        user.phone = phone ?? user.phone;
        user.address = address ?? user.address;
        user.preferences = preferences ?? user.preferences;
  
        const updatedUser = await user.save();
        res.json(updatedUser);
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (err) {
      return next(createHttpError(500, "Error while updating user"));
    }
  };

  // Delete a user by ID
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await userModel.findById(req.params.id);
      if (user) {
        await user.deleteOne();
        res.json({ message: 'User deleted' });
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (err) {
      return next(createHttpError(500, "Error while deleting user"));
    }
  };

// Change user roles (only admin can change roles)
export const changeUserRole = async (req: Request, res: Response, next: NextFunction) => {
    const { adminUserId, targetUserId, newRoles } = req.body;
  
    try {
      const adminUser = await userModel.findById(adminUserId);
  
      if (!adminUser || !adminUser.roles.includes('admin')) {
        return res.status(403).json({ message: 'Only an admin can change user roles' });
      }
  
      const targetUser = await userModel.findById(targetUserId);
  
      if (!targetUser) {
        return res.status(404).json({ message: 'Target user not found' });
      }
  
      targetUser.roles = newRoles;
      const updatedUser = await targetUser.save();
      res.json(updatedUser);
    } catch (err) {
        return next(createHttpError(500, "Error while changing user role"));
    }
  };