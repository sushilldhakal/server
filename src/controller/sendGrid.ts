import { config } from './../config/config';
import dotenv from 'dotenv';
import path from 'path';
// Load environment variables directly to ensure they're available
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// using Twilio SendGrid's v3 Node.js Library
// https://github.com/sendgrid/sendgrid-nodejs
import sgMail from '@sendgrid/mail'

// Initialize SendGrid with API key
const API_KEY = config.sendGridKey;
if (!API_KEY) {
  throw new Error('SendGrid API key is not defined');
}
sgMail.setApiKey(API_KEY);

// Verified sender email address for SendGrid - MUST be verified in your SendGrid account
const VERIFIED_SENDER = 'sus.hill.dhakal@gmail.com';

/**
 * Send verification email using SendGrid
 * @param email Recipient email address
 * @param token Verification token
 */
export const sendVerificationEmail = async (email: string, token: string) => {
  const verificationUrl = `${config.frontendDomain}/auth/login?token=${token}`;
  
  const msg = {
    to: email,
    from: VERIFIED_SENDER, // Use verified sender email
    subject: 'Verify Your Email',
    text: `Please click on the following link to verify your email: ${verificationUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 5px;">
        <h2 style="color: #333;">Email Verification</h2>
        <p>Thank you for registering! Please click on the following link to verify your email address:</p>
        <p style="margin: 20px 0;">
          <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a>
        </p>
        <p>Or copy and paste this link in your browser:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>This link will expire in 24 hours.</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log('Verification email sent successfully');
  } catch (error: any) {
    console.error('Error sending verification email:', error.toString());
    if (error.response && typeof error.response === 'object') {
      console.error('Error body:', error.response.body);
    }
    throw new Error('Error while sending verification email');
  }
};

/**
 * Send password reset email using SendGrid
 * @param email Recipient email address
 * @param token Reset token
 */
export const sendResetPasswordEmail = async (email: string, token: string) => {
  const resetUrl = `${config.frontendDomain}/auth/login?forgottoken=${token}`;
  
  const msg = {
    to: email,
    from: VERIFIED_SENDER, // Use verified sender email
    subject: 'Reset Your Password',
    text: `Please click on the following link to reset your password: ${resetUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 5px;">
        <h2 style="color: #333;">Password Reset</h2>
        <p>You've requested to reset your password. Please click on the following link to set a new password:</p>
        <p style="margin: 20px 0;">
          <a href="${resetUrl}" style="background-color: #4285F4; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
        </p>
        <p>Or copy and paste this link in your browser:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log('Reset password email sent successfully');
  } catch (error: any) {
    console.error('Error sending reset password email:', error.toString());
    if (error.response && typeof error.response === 'object') {
      console.error('Error body:', error.response.body);
    }
    throw new Error('Error while sending reset password email');
  }
};

// Example function for sending a test email (can be used for testing)
export const sendTestEmail = async () => {
  const msg = {
    to: 'sushildhakal1@gmail.com',
    from: VERIFIED_SENDER, // Use verified sender email
    subject: 'Sending with SendGrid is Fun',
    text: 'and easy to do anywhere, even with Node.js',
    html: '<strong>and easy to do anywhere, even with Node.js</strong>',
  }

  console.log('Attempting to send test email with SendGrid...');

  try {
    await sgMail.send(msg);
    console.log('Test email sent successfully');
    return true;
  } catch (error: any) {
    console.error('SendGrid error:', error.toString());
    if (error.response && typeof error.response === 'object') {
      console.error('Error body:', error.response.body);
    }
    return false;
  }
}