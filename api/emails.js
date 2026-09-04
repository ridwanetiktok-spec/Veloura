// api/emails.js - Using Supabase
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Validate email format
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // ============================================================
    // GET - Get all emails
    // ============================================================
    if (req.method === 'GET') {
        try {
            const { data, error } = await supabase
                .from('subscribers')
                .select('email, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const emails = data.map(row => row.email);

            return res.status(200).json({
                success: true,
                emails: emails,
                count: emails.length,
                data: data // Includes timestamps
            });
        } catch (error) {
            console.error('Error reading emails:', error);
            return res.status(500).json({
                success: false,
                message: 'Error reading emails: ' + error.message
            });
        }
    }

    // ============================================================
    // POST - Save a new email
    // ============================================================
    if (req.method === 'POST') {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is required'
                });
            }

            if (!isValidEmail(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid email format'
                });
            }

            // Check if email already exists
            const { data: existing, error: checkError } = await supabase
                .from('subscribers')
                .select('email')
                .eq('email', email)
                .maybeSingle();

            if (existing) {
                return res.status(200).json({
                    success: true,
                    alreadySubscribed: true,
                    message: 'Email already subscribed'
                });
            }

            // Insert new email
            const { error: insertError } = await supabase
                .from('subscribers')
                .insert({ email });

            if (insertError) throw insertError;

            return res.status(200).json({
                success: true,
                alreadySubscribed: false,
                message: 'Email saved successfully!'
            });

        } catch (error) {
            console.error('Error saving email:', error);
            return res.status(500).json({
                success: false,
                message: 'Server error: ' + error.message
            });
        }
    }

    // ============================================================
    // DELETE - Delete an email
    // ============================================================
    if (req.method === 'DELETE') {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is required'
                });
            }

            const { data, error } = await supabase
                .from('subscribers')
                .delete()
                .eq('email', email)
                .select();

            if (error) throw error;

            if (data.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Email not found'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Email deleted successfully!'
            });

        } catch (error) {
            console.error('Error deleting email:', error);
            return res.status(500).json({
                success: false,
                message: 'Server error: ' + error.message
            });
        }
    }

    // Method not allowed
    return res.status(405).json({
        success: false,
        message: 'Method not allowed'
    });
}