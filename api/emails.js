// api/emails.js - With Full Error Handling
import { createClient } from '@supabase/supabase-js';

// ============================================================
// Check environment variables FIRST
// ============================================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// If env vars are missing, this will be caught
if (!supabaseUrl) {
    console.error('❌ SUPABASE_URL is not set!');
}
if (!supabaseKey) {
    console.error('❌ SUPABASE_ANON_KEY is not set!');
}

// Initialize Supabase
let supabase;
try {
    supabase = createClient(supabaseUrl || '', supabaseKey || '');
} catch (err) {
    console.error('❌ Failed to create Supabase client:', err);
}

// ============================================================
// Main Handler with try-catch around EVERYTHING
// ============================================================
export default async function handler(req, res) {
    // Wrap everything in a try-catch
    try {
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        // Check if Supabase is initialized
        if (!supabase) {
            console.error('❌ Supabase client not initialized');
            return res.status(500).json({
                success: false,
                message: 'Database connection not initialized. Check environment variables.'
            });
        }

        // Check if environment variables are set
        if (!supabaseUrl || !supabaseKey) {
            console.error('❌ Missing environment variables');
            return res.status(500).json({
                success: false,
                message: 'Missing database credentials. Please check environment variables.'
            });
        }

        // ============================================================
        // GET - Get all emails
        // ============================================================
        if (req.method === 'GET') {
            try {
                console.log('📖 Fetching subscribers...');
                
                const { data, error } = await supabase
                    .from('subscribers')
                    .select('email, created_at')
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('❌ Supabase error:', error);
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
            } catch (error) {
                console.error('❌ GET error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error fetching emails: ' + error.message
                });
            }
        }

        // ============================================================
        // POST - Save a new email
        // ============================================================
        if (req.method === 'POST') {
            try {
                const { email } = req.body || {};

                if (!email) {
                    return res.status(400).json({
                        success: false,
                        message: 'Email is required'
                    });
                }

                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
                    console.error('❌ Check error:', checkError);
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
                    console.error('❌ Insert error:', insertError);
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
            } catch (error) {
                console.error('❌ POST error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error saving email: ' + error.message
                });
            }
        }

        // ============================================================
        // DELETE - Delete an email
        // ============================================================
        if (req.method === 'DELETE') {
            try {
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
                    console.error('❌ Delete error:', error);
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
            } catch (error) {
                console.error('❌ DELETE error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error deleting email: ' + error.message
                });
            }
        }

        // Method not allowed
        return res.status(405).json({
            success: false,
            message: 'Method not allowed'
        });

    } catch (error) {
        // Catch ANY error that happens in the handler
        console.error('❌ UNHANDLED ERROR:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}