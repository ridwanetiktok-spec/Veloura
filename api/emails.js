// api/emails.js - Production Ready
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with error handling
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Check if environment variables exist
if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables!');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

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

    try {
        // ============================================================
        // GET - Get all emails
        // ============================================================
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('subscribers')
                .select('email, created_at')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Supabase error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Database error: ' + error.message
                });
            }

            const emails = data?.map(row => row.email) || [];

            return res.status(200).json({
                success: true,
                emails: emails,
                count: emails.length,
                data: data || []
            });
        }

        // ============================================================
        // POST - Save a new email
        // ============================================================
        if (req.method === 'POST') {
            const { email } = req.body || {};

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

            if (checkError && checkError.code !== 'PGRST116') {
                console.error('Check error:', checkError);
                return res.status(500).json({
                    success: false,
                    message: 'Database error: ' + checkError.message
                });
            }

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

            if (insertError) {
                console.error('Insert error:', insertError);
                return res.status(500).json({
                    success: false,
                    message: 'Database error: ' + insertError.message
                });
            }

            return res.status(200).json({
                success: true,
                alreadySubscribed: false,
                message: 'Email saved successfully!'
            });
        }

        // ============================================================
        // DELETE - Delete an email
        // ============================================================
        if (req.method === 'DELETE') {
            const { email } = req.body || {};

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

            if (error) {
                console.error('Delete error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Database error: ' + error.message
                });
            }

            if (!data || data.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Email not found'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Email deleted successfully!'
            });
        }

        // Method not allowed
        return res.status(405).json({
            success: false,
            message: 'Method not allowed'
        });

    } catch (error) {
        console.error('Handler error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
}