import nodemailer from "nodemailer";

export const sendInvoiceEmail = async ({ email, name, orderId, paymentId, amount, planType }) => {
  try {
    let transporter;

    // Use environment variables if available
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || "587"),
        secure: process.env.EMAIL_PORT === "465",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    } else {
      // Fallback for development/testing: Ethereal test account
      console.log("No custom email environment variables configured. Creating Ethereal testing account...");
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const planDetails = {
      bronze: { limit: "7 minute viewing limit", price: "₹10" },
      silver: { limit: "10 minute viewing limit", price: "₹50" },
      gold: { limit: "Unlimited viewing", price: "₹100" }
    };

    const selectedPlan = planDetails[planType.toLowerCase()] || { limit: "N/A", price: `₹${amount}` };

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #ff0000; margin: 0;">YourTube Premium</h2>
          <p style="color: #666; font-size: 14px; margin: 5px 0 0 0;">Payment Confirmation & Invoice</p>
        </div>
        
        <p>Dear <strong>${name}</strong>,</p>
        <p>Thank you for subscribing to YourTube Premium! Your payment was processed successfully, and your plan is now active.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Subscription Details</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #666;"><strong>Plan Type:</strong></td>
              <td style="padding: 6px 0; text-align: right; text-transform: capitalize;"><strong>${planType}</strong></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666;"><strong>Plan Features:</strong></td>
              <td style="padding: 6px 0; text-align: right;">${selectedPlan.limit}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666;"><strong>Amount Paid:</strong></td>
              <td style="padding: 6px 0; text-align: right; color: #ff0000; font-size: 16px;"><strong>${selectedPlan.price}</strong></td>
            </tr>
          </table>
        </div>

        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Transaction Info</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #666;"><strong>Order ID:</strong></td>
              <td style="padding: 6px 0; text-align: right;">${orderId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666;"><strong>Payment ID:</strong></td>
              <td style="padding: 6px 0; text-align: right;">${paymentId}</td>
            </tr>
          </table>
        </div>
        
        <p style="font-size: 14px; color: #555;">If you have any questions regarding this invoice, feel free to contact our customer support team.</p>
        <p style="font-size: 14px; color: #555;">Happy streaming!</p>
        <p style="margin-top: 25px; border-top: 1px solid #eee; padding-top: 15px; font-size: 12px; color: #999; text-align: center;">
          This is an automated transaction receipt. Please do not reply directly to this email.
        </p>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"YourTube Billing" <billing@yourtube.com>',
      to: email,
      subject: `YourTube Premium ${planType.toUpperCase()} Subscription Invoice`,
      html: emailHtml,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully!");
    if (!process.env.EMAIL_HOST) {
      console.log(`Ethereal Mock Email URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    return true;
  } catch (error) {
    console.error("Failed to send invoice email:", error);
    return false;
  }
};

export const sendOtpEmail = async ({ email, otp }) => {
  try {
    let transporter;

    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || "587"),
        secure: process.env.EMAIL_PORT === "465",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    } else {
      console.log("No custom email environment variables configured for OTP. Creating Ethereal testing account...");
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #ff0000; margin: 0;">YourTube Authentication</h2>
          <p style="color: #666; font-size: 14px; margin: 5px 0 0 0;">One-Time Password (OTP)</p>
        </div>
        
        <p>Dear User,</p>
        <p>You requested a verification code to sign in to YourTube. Please use the following 6-digit OTP code to complete your sign in:</p>
        
        <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-radius: 6px; margin: 20px 0; border: 1px dashed #ccc;">
          <span style="font-size: 32px; font-weight: bold; color: #ff0000; letter-spacing: 5px;">${otp}</span>
        </div>

        <p style="font-size: 14px; color: #555;">This OTP is valid for <strong>5 minutes</strong>. If you did not request this code, please ignore this email.</p>
        <p style="font-size: 14px; color: #555;">Happy streaming!</p>
        <p style="margin-top: 25px; border-top: 1px solid #eee; padding-top: 15px; font-size: 12px; color: #999; text-align: center;">
          This is an automated authentication email. Please do not reply directly to this email.
        </p>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"YourTube Auth" <auth@yourtube.com>',
      to: email,
      subject: `YourTube Login Verification Code: ${otp}`,
      html: emailHtml,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`OTP Email sent successfully to ${email}!`);
    if (!process.env.EMAIL_HOST) {
      const etherealUrl = nodemailer.getTestMessageUrl(info);
      console.log(`[TEST MODE] Ethereal OTP Email URL: ${etherealUrl}`);
      return { success: true, etherealUrl };
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    return { success: false, error };
  }
};

