"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const userSchema = new mongoose_1.default.Schema({
    name: {
        type: String,
        required: true,
    },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    roles: {
        type: String,
        enum: ['user', 'admin', 'company', 'subscriber'],
        default: 'user',
        // validate: {
        //   validator: function(v: string[]) {
        //     return v.length > 0;
        //   },
        //   message: 'A user must have at least one role.'
        // }
    },
}, { timestamps: true });
exports.default = mongoose_1.default.model("User", userSchema);
