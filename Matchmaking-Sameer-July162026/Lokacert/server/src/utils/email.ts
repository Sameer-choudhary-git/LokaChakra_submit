import nodemailer from 'nodemailer';
import logger from './logStash-logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmployeeConfirmationData {
  companyName: string;
  employeeName: string;
  employeeEmail: string;
  verifyUrl: string;
}

interface CertificateNotificationData {
  employeeName: string;
  certificateName: string;
  companyName: string;
  certificateId: string;
  verifyUrl: string;
}

interface AwardNotificationData {
  employeeName: string;
  awardName: string;
  companyName: string;
  awardDescription: string;
}

interface EmployeeUpdateNotificationData {
  employeeName: string;
  companyName: string;
  updatedFields: string[];
}

interface CompanyWelcomeData {
  companyName: string;
  authorityEmail: string;
  companyId: string;
  dashboardUrl: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Verify transporter configuration
    this.transporter.verify((error, _success) => {
      if (error) {
        logger.error('Email transporter verification failed:', error);
      } else {
        logger.info('Email service is ready to send messages');
      }
    });
  }

  private async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const info = await this.transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || 'Lokacert'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      logger.info(
        `Email sent successfully to ${options.to}: ${info.messageId}`
      );
      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send employee confirmation email
   */
  async sendEmployeeConfirmation(
    data: EmployeeConfirmationData
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .button:hover { background: #5568d3; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .info-box { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to ${data.companyName}!</h1>
          </div>
          <div class="content">
            <p>Hi ${data.employeeName},</p>
            
            <p><strong>${data.companyName}</strong> has created an employee account for you on Lokacert, the blockchain-powered certificate management platform.</p>
            
            <div class="info-box">
              <p><strong>What's Next?</strong></p>
              <p>Click the button below to verify your email and complete your onboarding. You'll be asked to connect or create a secure Web3 wallet to access your certificates and awards.</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${data.verifyUrl}" class="button">Verify & Complete Onboarding</a>
            </div>
            
            <p><strong>Why Lokacert?</strong></p>
            <ul>
              <li>🔐 Secure, tamper-proof certificates stored on blockchain</li>
              <li>🎯 Instant verification for anyone, anywhere</li>
              <li>🏆 Collect and showcase your achievements as NFTs</li>
              <li>📱 Access your credentials anytime, anywhere</li>
            </ul>
            
            <p>If you didn't expect this email, please contact ${data.companyName} directly.</p>
            
            <p>Best regards,<br>The Lokacert Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message from Lokacert. Please do not reply to this email.</p>
            <p>If the button doesn't work, copy this link: ${data.verifyUrl}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Welcome to ${data.companyName}!

Hi ${data.employeeName},

${data.companyName} has created an employee account for you on Lokacert.

Please verify your email and complete your onboarding by visiting:
${data.verifyUrl}

Best regards,
The Lokacert Team
    `;

    return this.sendEmail({
      to: data.employeeEmail,
      subject: `Welcome to ${data.companyName} - Verify Your Account`,
      html,
      text,
    });
  }

  /**
   * Send certificate issuance notification
   */
  async sendCertificateNotification(
    data: CertificateNotificationData,
    employeeEmail: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .certificate-box { background: white; padding: 20px; border: 2px solid #667eea; border-radius: 8px; margin: 20px 0; text-align: center; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 New Certificate Issued!</h1>
          </div>
          <div class="content">
            <p>Hi ${data.employeeName},</p>
            
            <p>Congratulations! <strong>${data.companyName}</strong> has issued you a new certificate.</p>
            
            <div class="certificate-box">
              <h2 style="color: #667eea; margin: 10px 0;">${data.certificateName}</h2>
              <p style="color: #666; margin: 5px 0;">Certificate ID: ${data.certificateId}</p>
            </div>
            
            <p>Your certificate has been securely stored on the blockchain and can be verified by anyone using the link below.</p>
            
            <div style="text-align: center;">
              <a href="${data.verifyUrl}" class="button">View Certificate</a>
            </div>
            
            <p><strong>Share Your Achievement:</strong></p>
            <p>You can share your certificate verification link with employers, educational institutions, or anyone who needs to verify your credentials.</p>
            
            <p>Best regards,<br>${data.companyName} via Lokacert</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from Lokacert.</p>
            <p>Verify link: ${data.verifyUrl}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
New Certificate Issued!

Hi ${data.employeeName},

Congratulations! ${data.companyName} has issued you a new certificate:

Certificate: ${data.certificateName}
Certificate ID: ${data.certificateId}

View and verify your certificate at:
${data.verifyUrl}

Best regards,
${data.companyName} via Lokacert
    `;

    return this.sendEmail({
      to: employeeEmail,
      subject: `New Certificate Issued: ${data.certificateName}`,
      html,
      text,
    });
  }

  /**
   * Send award notification
   */
  async sendAwardNotification(
    data: AwardNotificationData,
    employeeEmail: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .award-box { background: white; padding: 25px; border: 3px solid #f5576c; border-radius: 8px; margin: 20px 0; text-align: center; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏆 You've Received an Award!</h1>
          </div>
          <div class="content">
            <p>Hi ${data.employeeName},</p>
            
            <p>Fantastic news! <strong>${data.companyName}</strong> has awarded you an NFT recognition.</p>
            
            <div class="award-box">
              <h2 style="color: #f5576c; margin: 10px 0;">${data.awardName}</h2>
              <p style="color: #666; margin: 15px 0;">${data.awardDescription}</p>
            </div>
            
            <p>This award has been minted as an NFT (Non-Fungible Token) and is now in your wallet. It's a unique digital badge of your achievement that you truly own!</p>
            
            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/my-dashboard" class="button">View Your Awards</a>
            </div>
            
            <p><strong>What's an NFT Award?</strong></p>
            <ul>
              <li>✨ Unique digital collectible stored on blockchain</li>
              <li>🔒 Permanently yours - cannot be duplicated or taken away</li>
              <li>🌍 Verifiable proof of your achievement</li>
              <li>💼 Showcase in your digital portfolio</li>
            </ul>
            
            <p>Congratulations on your achievement!</p>
            
            <p>Best regards,<br>${data.companyName} via Lokacert</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from Lokacert.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
🏆 You've Received an Award!

Hi ${data.employeeName},

${data.companyName} has awarded you: ${data.awardName}

${data.awardDescription}

This award has been minted as an NFT and is now in your wallet.

View your awards at: ${process.env.CLIENT_URL}/my-dashboard

Congratulations!

Best regards,
${data.companyName} via Lokacert
    `;

    return this.sendEmail({
      to: employeeEmail,
      subject: `🏆 New Award: ${data.awardName}`,
      html,
      text,
    });
  }

  /**
   * Send employee profile update notification
   */
  async sendEmployeeUpdateNotification(
    data: EmployeeUpdateNotificationData,
    employeeEmail: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .info-box { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📝 Profile Updated</h1>
          </div>
          <div class="content">
            <p>Hi ${data.employeeName},</p>
            
            <p><strong>${data.companyName}</strong> has updated your employee profile.</p>
            
            <div class="info-box">
              <p><strong>Updated Fields:</strong></p>
              <ul>
                ${data.updatedFields.map((field) => `<li>${field}</li>`).join('')}
              </ul>
            </div>
            
            <p>These changes have been recorded on the blockchain for transparency and security.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/my-dashboard" class="button">View Your Profile</a>
            </div>
            
            <p>If you have any questions about these changes, please contact your administrator at ${data.companyName}.</p>
            
            <p>Best regards,<br>${data.companyName} via Lokacert</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from Lokacert.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Profile Updated

Hi ${data.employeeName},

${data.companyName} has updated your employee profile.

Updated Fields:
${data.updatedFields.map((field) => `- ${field}`).join('\n')}

View your profile at: ${process.env.CLIENT_URL}/my-dashboard

Best regards,
${data.companyName} via Lokacert
    `;

    return this.sendEmail({
      to: employeeEmail,
      subject: 'Your Employee Profile Has Been Updated',
      html,
      text,
    });
  }

  /**
   * Send company welcome email
   */
  async sendCompanyWelcome(data: CompanyWelcomeData): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .feature-box { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Lokacert!</h1>
            <p style="font-size: 18px; margin-top: 10px;">Your company account is ready</p>
          </div>
          <div class="content">
            <p>Hi there,</p>
            
            <p>Congratulations! Your company <strong>${data.companyName}</strong> has been successfully registered on Lokacert.</p>
            
            <div class="feature-box">
              <h3 style="color: #667eea; margin-top: 0;">🚀 Getting Started</h3>
              <p>You can now:</p>
              <ul>
                <li>Add employees to your organization</li>
                <li>Create custom certificate templates</li>
                <li>Issue blockchain-verified certificates</li>
                <li>Award NFT recognitions to team members</li>
                <li>Track all certifications in real-time</li>
              </ul>
            </div>
            
            <div style="text-align: center;">
              <a href="${data.dashboardUrl}" class="button">Go to Dashboard</a>
            </div>
            
            <div class="feature-box">
              <h3 style="color: #667eea; margin-top: 0;">📋 Your Company Details</h3>
              <p><strong>Company ID:</strong> ${data.companyId}</p>
              <p><strong>Admin Email:</strong> ${data.authorityEmail}</p>
            </div>
            
            <p><strong>Why Lokacert?</strong></p>
            <ul>
              <li>🔐 <strong>Blockchain Security:</strong> Tamper-proof, permanent records</li>
              <li>⚡ <strong>Instant Verification:</strong> Anyone can verify certificates instantly</li>
              <li>💰 <strong>Cost Effective:</strong> Eliminate printing and manual verification</li>
              <li>🌍 <strong>Global Recognition:</strong> Accessible from anywhere in the world</li>
              <li>📊 <strong>Analytics Dashboard:</strong> Track all certifications in one place</li>
            </ul>
            
            <p><strong>Need Help?</strong></p>
            <p>Check out our documentation or contact support if you have any questions. We're here to help you succeed!</p>
            
            <p>Welcome aboard!</p>
            
            <p>Best regards,<br>The Lokacert Team</p>
          </div>
          <div class="footer">
            <p>This is an automated welcome message from Lokacert.</p>
            <p>Company ID: ${data.companyId}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Welcome to Lokacert!

Hi there,

Congratulations! Your company ${data.companyName} has been successfully registered on Lokacert.

Company ID: ${data.companyId}
Admin Email: ${data.authorityEmail}

You can now:
- Add employees to your organization
- Create custom certificate templates
- Issue blockchain-verified certificates
- Award NFT recognitions to team members
- Track all certifications in real-time

Get started: ${data.dashboardUrl}

Welcome aboard!

Best regards,
The Lokacert Team
    `;

    return this.sendEmail({
      to: data.authorityEmail,
      subject: `Welcome to Lokacert - ${data.companyName}`,
      html,
      text,
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();
