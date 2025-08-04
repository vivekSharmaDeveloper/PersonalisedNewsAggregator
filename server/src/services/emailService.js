const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (to, subject, text, html) => {
  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject,
    text,
    html,
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent to ${to} with subject: ${subject}`);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
  }
};

const sendWelcomeEmail = (user) => {
  const subject = `Welcome to NewsHub, ${user.fullName}!`;
  const text = `Hi ${user.fullName},

Welcome to NewsHub! We're excited to have you on board.

With your new account, you can:
• Get personalized news recommendations
• Bookmark your favorite articles
• Customize your news sources and interests
• Access news from multiple reliable sources

To get started, simply log in and set up your preferences.

Happy reading!

The NewsHub Team`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to NewsHub</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .feature { margin: 15px 0; padding: 10px; background: white; border-left: 4px solid #667eea; border-radius: 5px; }
        .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🗞️ Welcome to NewsHub!</h1>
        <p>Your personalized news experience starts here</p>
      </div>
      <div class="content">
        <p>Hi <strong>${user.fullName}</strong>,</p>
        <p>Welcome to NewsHub! We're thrilled to have you join our community of informed readers.</p>
        
        <h3>What you can do with NewsHub:</h3>
        <div class="feature">📰 <strong>Personalized Recommendations</strong> - Get news tailored to your interests</div>
        <div class="feature">🔖 <strong>Bookmark Articles</strong> - Save articles to read later</div>
        <div class="feature">⚙️ <strong>Customize Sources</strong> - Choose from trusted news sources</div>
        <div class="feature">📱 <strong>Mobile Friendly</strong> - Access news anywhere, anytime</div>
        
        <p>Ready to get started? Set up your preferences to receive personalized news recommendations.</p>
        <a href="${process.env.FRONTEND_URL}/preferences" class="cta-button">Set Up Preferences</a>
        
        <p>Happy reading!</p>
        <p><strong>The NewsHub Team</strong></p>
      </div>
      <div class="footer">
        <p>© 2024 NewsHub. All rights reserved.</p>
        <p>Stay informed, stay connected.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail(user.email, subject, text, html);
};

const sendForgotPasswordEmail = (user, resetUrl) => {
  const subject = 'Reset Your NewsHub Password';
  const text = `Hi ${user.fullName},

We received a request to reset your password for your NewsHub account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

Best regards,
The NewsHub Team`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .alert { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .cta-button { display: inline-block; background: #ff6b6b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .security-note { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🔐 Password Reset Request</h1>
        <p>Secure your NewsHub account</p>
      </div>
      <div class="content">
        <p>Hi <strong>${user.fullName}</strong>,</p>
        <p>We received a request to reset your password for your NewsHub account.</p>
        
        <div class="alert">
          ⚠️ <strong>Action Required:</strong> Click the button below to create a new password.
        </div>
        
        <a href="${resetUrl}" class="cta-button">Reset My Password</a>
        
        <div class="security-note">
          <strong>🛡️ Security Information:</strong>
          <ul>
            <li>This link will expire in <strong>1 hour</strong></li>
            <li>The link can only be used once</li>
            <li>If you didn't request this reset, please ignore this email</li>
          </ul>
        </div>
        
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background: #f1f3f4; padding: 10px; border-radius: 5px; font-family: monospace;">${resetUrl}</p>
        
        <p>Best regards,<br><strong>The NewsHub Team</strong></p>
      </div>
      <div class="footer">
        <p>© 2024 NewsHub. All rights reserved.</p>
        <p>This is an automated security email.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail(user.email, subject, text, html);
};

const sendPasswordResetConfirmationEmail = (user) => {
  const subject = 'Your NewsHub Password Has Been Reset';
  const text = `Hi ${user.fullName},

Great news! Your NewsHub password has been successfully reset.

Your account is now secure with your new password. You can log in to NewsHub using your new credentials.

If you did not make this change, please contact our support team immediately.

Security Tips:
• Use a strong, unique password
• Don't share your password with anyone
• Log out from shared devices

Best regards,
The NewsHub Team`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Successful</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #51cf66 0%, #40c057 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0; color: #155724; }
        .cta-button { display: inline-block; background: #51cf66; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .security-tips { background: #e3f2fd; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>✅ Password Reset Successful</h1>
        <p>Your account is secure</p>
      </div>
      <div class="content">
        <p>Hi <strong>${user.fullName}</strong>,</p>
        
        <div class="success">
          🎉 <strong>Success!</strong> Your NewsHub password has been successfully reset.
        </div>
        
        <p>Your account is now secure with your new password. You can log in to NewsHub and continue enjoying personalized news.</p>
        
        <a href="${process.env.FRONTEND_URL}/login" class="cta-button">Log In to NewsHub</a>
        
        <div class="security-tips">
          <h3>🔒 Security Tips:</h3>
          <ul>
            <li><strong>Keep it strong:</strong> Use a unique password with letters, numbers, and symbols</li>
            <li><strong>Keep it secret:</strong> Don't share your password with anyone</li>
            <li><strong>Stay secure:</strong> Always log out from shared or public devices</li>
            <li><strong>Stay alert:</strong> Contact us immediately if you notice any suspicious activity</li>
          </ul>
        </div>
        
        <p><strong>Note:</strong> If you did not make this change, please contact our support team immediately.</p>
        
        <p>Best regards,<br><strong>The NewsHub Team</strong></p>
      </div>
      <div class="footer">
        <p>© 2024 NewsHub. All rights reserved.</p>
        <p>Your security is our priority.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail(user.email, subject, text, html);
};

module.exports = {
  sendWelcomeEmail,
  sendForgotPasswordEmail,
  sendPasswordResetConfirmationEmail,
};

