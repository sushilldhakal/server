"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeUserRole = exports.deleteUser = exports.updateUser = exports.getUserById = exports.getAllUsers = exports.loginUser = exports.createUser = void 0;
const http_errors_1 = __importDefault(require("http-errors"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const userModel_1 = __importDefault(require("./userModel"));
const jsonwebtoken_1 = require("jsonwebtoken");
const config_1 = require("../config/config");
const express_validator_1 = require("express-validator");
// create user
const createUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        const error = (0, http_errors_1.default)(400, "All fields are required");
        return next(error);
    }
    // Database call.
    try {
        const user = yield userModel_1.default.findOne({ email });
        if (user) {
            const error = (0, http_errors_1.default)(400, "User already exists with this email.");
            return next(error);
        }
    }
    catch (err) {
        return next((0, http_errors_1.default)(500, "Error while getting user"));
    }
    // Hash password.
    const hashedPassword = yield bcrypt_1.default.hash(password, 10);
    const newUser = yield userModel_1.default.create({
        name,
        email,
        password: hashedPassword,
    });
    try {
        // Token generation JWT
        const token = (0, jsonwebtoken_1.sign)({ sub: newUser._id }, config_1.config.jwtSecret, {
            expiresIn: "7d",
            algorithm: "HS256",
        });
        // Response
        res.status(201).json({ accessToken: token });
    }
    catch (err) {
        return next((0, http_errors_1.default)(500, "Error while signing the jwt token"));
    }
});
exports.createUser = createUser;
// Login a user
const loginUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    if (!email || !password) {
        return next((0, http_errors_1.default)(400, "All fields are required"));
    }
    try {
        const user = yield userModel_1.default.findOne({ email });
        if (!user) {
            return next((0, http_errors_1.default)(404, "User not found."));
        }
        const isMatch = yield bcrypt_1.default.compare(password, user.password);
        if (!isMatch) {
            return next((0, http_errors_1.default)(400, "Username or password incorrect!"));
        }
        // Token generation JWT
        const token = (0, jsonwebtoken_1.sign)({ sub: user._id, roles: user.roles }, config_1.config.jwtSecret, {
            expiresIn: "7d",
            algorithm: "HS256",
        });
        res.json({ accessToken: token, roles: user.roles, userId: user._id, userEmail: user.email });
    }
    catch (err) {
        console.error('Error while logging in user:', err);
        next((0, http_errors_1.default)(500, "Error while logging in user"));
    }
});
exports.loginUser = loginUser;
// Get all users
const getAllUsers = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield userModel_1.default.find();
        res.json(users);
    }
    catch (err) {
        return next((0, http_errors_1.default)(500, "Error while getting users"));
    }
});
exports.getAllUsers = getAllUsers;
// Get a single user by ID
const getUserById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    try {
        const user = yield userModel_1.default.findById(userId);
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
        res.json({ user, breadcrumbs });
    }
    catch (err) {
        return next((0, http_errors_1.default)(500, "Error while getting user"));
    }
});
exports.getUserById = getUserById;
// Update a user by ID
const updateUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { name, email, roles, password } = req.body;
    const userId = req.params.userId;
    try {
        const user = yield userModel_1.default.findOne({ _id: userId });
        if (!user) {
            return next((0, http_errors_1.default)(404, "User not found"));
        }
        const _req = req;
        // Check if the current user is authorized to update the user
        if (!(userId === _req.userId || _req.roles === "admin")) {
            return next((0, http_errors_1.default)(403, "You cannot update other users."));
        }
        const updateData = {
            name: name || user.name,
            email: email || user.email,
            roles: roles || user.roles, // Ensure roles is handled as string
        };
        if (password) {
            const salt = yield bcrypt_1.default.genSalt(10);
            updateData.password = yield bcrypt_1.default.hash(password, salt);
        }
        const updatedUser = yield userModel_1.default.findOneAndUpdate({ _id: userId }, updateData, { new: true });
        console.log(`Updated user: ${updatedUser}`);
        res.json(updatedUser);
    }
    catch (err) {
        console.error('Error while updating user:', err);
        next((0, http_errors_1.default)(500, "Error while updating user"));
    }
});
exports.updateUser = updateUser;
// Delete a user by ID
const deleteUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield userModel_1.default.findById(req.params.id);
        if (user) {
            yield user.deleteOne();
            res.json({ message: 'User deleted' });
        }
        else {
            res.status(404).json({ message: 'User not found' });
        }
    }
    catch (err) {
        return next((0, http_errors_1.default)(500, "Error while deleting user"));
    }
});
exports.deleteUser = deleteUser;
// Change user roles (only admin can change roles)
const changeUserRole = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { adminUserId, targetUserId, newRoles } = req.body;
    try {
        const adminUser = yield userModel_1.default.findById(adminUserId);
        if (!adminUser || !adminUser.roles.includes('admin')) {
            return res.status(403).json({ message: 'Only an admin can change user roles' });
        }
        const targetUser = yield userModel_1.default.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ message: 'Target user not found' });
        }
        targetUser.roles = newRoles;
        const updatedUser = yield targetUser.save();
        res.json(updatedUser);
    }
    catch (err) {
        return next((0, http_errors_1.default)(500, "Error while changing user role"));
    }
});
exports.changeUserRole = changeUserRole;
