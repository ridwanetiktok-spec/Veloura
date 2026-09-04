// api/emails.js - Uses VITE_ prefixed variables
import { createClient } from '@supabase/supabase-js';

// Use VITE_ prefixed variables (same as frontend)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// Log environment variables status
console.log('🔍 Checking environment variables:');
console.log('VITE_SUPABASE_URL exists:', !!supabaseUrl);
console.log('VITE_SUPABASE_ANON_KEY exists:', !!supabaseKey);

// Check if environment variables are set
if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables!');
    console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.error('VITE_SUPABASE_ANON_KEY:', supabaseKey ? '✅ Set' : '❌ Missing');
}

// Create Supabase client
let supabase;
try {
    supabase = createClient(supabaseUrl || '', supabaseKey || '');
    console.log('✅ Supabase client created successfully');
} catch (error) {
    console.error('❌ Failed to create Supabase client:', error);
}

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

    // Check if Supabase is initialized
    if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return res.status(500).json({
            success: false,
            message: 'Database connection not initialized. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
        });
    }

    // Check if environment variables are set
    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing environment variables');
        return res.status(500).json({
            success: false,
            message: 'Missing database credentials. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
        });
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

            console.log(`✅ Found ${emails.length} subscribers`);

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
            console.log(`📧 Attempting to save: ${email}`);

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
                console.error('❌ Check error:', checkError);
                return res.status(500).json({
                    success: false,
                    message: 'Database error: ' + checkError.message
                });
            }

            if (existing) {
                console.log('⚠️ Email already exists:', email);
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

            console.log('✅ Email saved successfully:', email);

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
            console.log(`🗑️ Attempting to delete: ${email}`);

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
                console.log('❌ Email not found:', email);
                return res.status(404).json({
                    success: false,
                    message: 'Email not found'
                });
            }

            console.log('✅ Email deleted successfully:', email);

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
}