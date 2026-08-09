/**
 * Contact form route
 */
const router = require('express').Router();
const { getDBPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { CONFIG } = require('../config/app');
const { transporter } = require('../config/email');

router.post('/contact', async (req, res) => {
    try {
        const { name, phone, email, message } = req.body;

        if (!name || !phone || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        const mailOptions = {
            from: `Resolvia Contact <${CONFIG.GMAIL_USER}>`,
            to: CONFIG.RECIPIENT_EMAIL,
            replyTo: email,
            subject: `New Contact Form Submission from ${name}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #085144; margin-bottom: 10px;">New Contact Message</h2>
                        <p style="color: #666;">Resolvia System Notification</p>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Phone:</strong> ${phone}</p>
                    </div>
                    
                    <div style="background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #eee; margin-bottom: 20px;">
                        <p style="font-weight: bold; margin-bottom: 10px;">Message:</p>
                        <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
                    </div>
                    
                    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                    
                    <div style="text-align: center; color: #999; font-size: 12px;">
                        <p>This message was sent via the Resolvia contact form.</p>
                        <p>© ${new Date().getFullYear()} Resolvia. All rights reserved.</p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        res.json({
            success: true,
            message: 'Your message has been sent successfully!'
        });

    } catch (error) {
        console.error('Contact API error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message. Please try again later.'
        });
    }
});

module.exports = router;
