import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import bcrypt from "bcrypt";
import userModel from "./userModel";
import jwt from "jsonwebtoken";
import { sign } from "jsonwebtoken";
import { validationResult } from "express-validator";
import { AuthRequest } from "../../middlewares/authenticate";
import { config } from "../../config/config";
import { sendResetPasswordEmail, sendVerificationEmail } from "../../controller/sendGrid";
// create user
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password, phone } = req.body;
  console.log(req.body)
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
  try {
    const newUser = await userModel.create({
      name,
      email,
      phone,
      password: hashedPassword,
      verified: false, 
    });

    try {
      const verificationToken = jwt.sign({ sub: newUser._id }, config.jwtSecret, {
        expiresIn: '1h', // 1 hour
        algorithm: 'HS256',
      });
      await sendVerificationEmail(email, verificationToken);
      res.status(201).json({ message: 'Verification email sent. Please check your inbox.' });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Still create the user but notify about email failure
      res.status(201).json({ 
        message: 'User created successfully but verification email could not be sent. Please contact support.', 
        user: { id: newUser._id, name: newUser.name, email: newUser.email }
      });
    }
   
  } catch (err) {
    return next(createHttpError(500, "Error while creating user"));
  }
};

// Login a user
export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
    const { email, password, keepMeSignedIn = false } = req.body;
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
    const expiresIn = keepMeSignedIn ? '30d' : '2h';
    const token = sign({ sub: user._id, roles: user.roles as string }, config.jwtSecret as string, {
      expiresIn,
      algorithm: "HS256",
    });

      res.json({ accessToken: token, roles: user.roles, userId: user._id, userEmail: user.email });
      } catch (err) {
      console.error('Error while logging in user:', err);
      next(createHttpError(500, "Error while logging in user"));
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
  const {userId} = req.params;
    try {
      const user = await userModel.findById(userId);
        if (!user) {
          throw new Error('User not found');
          // return next(createHttpError(404, 'User not found'));
        }
        const breadcrumbs = [
          {
            label: user.name,
            url: `/api/users/${userId}`,
          }
        ];
        res.json({user, breadcrumbs} );
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

  const { name, email, roles, password, phone } = req.body;
  const userId = req.params.userId;
console.log(req.body)
  try {
    const user = await userModel.findOne({ _id: userId });

    if (!user) {
      return next(createHttpError(404, "User not found"));
    }

    const _req = req as AuthRequest;
    // Check if the current user is authorized to update the user
    if (!(userId === _req.userId || _req.roles === "admin")) {
      return next(createHttpError(403, "You cannot update other users."));
    }

    const updateData: any = {
      name: name || user.name,
      email: email || user.email,
      roles: roles || user.roles, // Ensure roles is handled as string
      phone: phone || user.phone
    };

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await userModel.findOneAndUpdate(
      { _id: userId },
      updateData,
      { new: true }
    );
    res.json(updatedUser);
  } catch (err) {
    console.error('Error while updating user:', err);
    next(createHttpError(500, "Error while updating user"));
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


export const verifyUser = async (req: Request, res: Response, next: NextFunction) => {
  const { token } = req.body;

  if (!token) {
    return next(createHttpError(400, "Token is required"));
  }

  try {
    const decoded = jwt.verify(token as string, config.jwtSecret) as { sub: string };
    const user = await userModel.findById(decoded.sub);

    if (!user) {
      return next(createHttpError(400, "Invalid token"));
    }

    user.verified = true;
    await user.save();

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (err) {
    return next(createHttpError(400, "Invalid or expired token"));
  }
};


export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;

  if (!email) {
    const error = createHttpError(400, 'Email is required');
    return next(error);
  }

  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      const error = createHttpError(404, 'User not found');
      return next(error);
    }
    console.log(user)
    if (!config.jwtSecret) {
      throw new Error('JWT Secret is not defined');
    }

    const resetToken = jwt.sign({ sub: user._id }, config.jwtSecret, {
      expiresIn: '1h', // Reset token expires in 1 hour
      algorithm: 'HS256',
    });

    await sendResetPasswordEmail(email, resetToken);

    res.status(200).json({ message: 'Password reset email sent. Please check your inbox.' });
  } catch (err) {
    return next(createHttpError(500, 'Error while sending password reset email'));
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return next(createHttpError(400, 'Token and new password are required'));
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { sub: string };
    const user = await userModel.findById(decoded.sub);

    if (!user) {
      return next(createHttpError(404, 'User not found'));
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword; // Assuming you are hashing passwords before saving
    await user.save();

    res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    return next(createHttpError(400, 'Invalid or expired token'));
  }
};