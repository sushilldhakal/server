"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("./userController");
const express_validator_1 = require("express-validator");
const authenticate_1 = __importDefault(require("../middlewares/authenticate"));
const userRouter = express_1.default.Router();
//routes
userRouter.post('/register', [
    (0, express_validator_1.body)('name').notEmpty(),
    (0, express_validator_1.body)('email').isEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 6 })
], userController_1.createUser);
userRouter.post('/login', [(0, express_validator_1.body)('email').isEmail(), (0, express_validator_1.body)('password').isLength({ min: 6 })], userController_1.loginUser);
userRouter.get('/all', authenticate_1.default, userController_1.getAllUsers);
userRouter.get('/:userId', [(0, express_validator_1.param)('userId').isMongoId(), authenticate_1.default], userController_1.getUserById);
userRouter.put('/:userId', authenticate_1.default, userController_1.updateUser);
userRouter.delete('/:userId', [(0, express_validator_1.param)('id').isMongoId(), authenticate_1.default], userController_1.deleteUser);
userRouter.post('/change-role', authenticate_1.default, userController_1.changeUserRole);
exports.default = userRouter;
