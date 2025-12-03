import { supabase } from './supabase';
import bcrypt from 'bcryptjs';

export interface AuthUser {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone: string;
  collegeName: string;
  gfgMantriId: string;
}

class AuthService {
  private currentUser: AuthUser | null = null;

  // Register new campus mantri using custom auth system
  async register(data: RegisterData): Promise<{ success: boolean; error?: string; user?: AuthUser }> {
    try {

      // Validate input data
      if (!data.email || !data.password || !data.name || !data.gfgMantriId) {
        return { success: false, error: 'All required fields must be filled' };
      }

      // Check if GFG Mantri ID already exists
      const { data: existingMantri } = await supabase
        .from('campus_mantris')
        .select('id')
        .eq('gfg_mantri_id', data.gfgMantriId)
        .maybeSingle();

      if (existingMantri) {
        return { success: false, error: 'GFG Mantri ID already registered' };
      }

      // Check if email already exists in auth_users
      const { data: existingAuthUser } = await supabase
        .from('auth_users')
        .select('id')
        .eq('email', data.email)
        .maybeSingle();

      if (existingAuthUser) {
        return { success: false, error: 'Email already registered' };
      }

      // Check if email already exists in campus_mantris
      const { data: existingEmail } = await supabase
        .from('campus_mantris')
        .select('id')
        .eq('email', data.email)
        .maybeSingle();

      if (existingEmail) {
        return { success: false, error: 'Email already registered' };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 12);

      // Create auth user first
      const { data: authUser, error: authError } = await supabase
        .from('auth_users')
        .insert([{
          email: data.email,
          password_hash: passwordHash,
          is_active: true
        }])
        .select()
        .single();

      if (authError) {
        console.error('❌ Auth user creation error:', authError);
        return { success: false, error: 'Failed to create user account' };
      }


      // Create campus mantri profile
      const { data: mantriProfile, error: mantriError } = await supabase
        .from('campus_mantris')
        .insert([{
          user_id: authUser.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          college_name: data.collegeName,
          gfg_mantri_id: data.gfgMantriId,
          status: 'active'
        }])
        .select()
        .single();

      if (mantriError) {
        console.error('❌ Campus mantri profile creation error:', mantriError);
        // Clean up auth user if mantri creation fails
        await supabase.from('auth_users').delete().eq('id', authUser.id);
        return { success: false, error: 'Failed to create campus mantri profile' };
      }


      // Create initial leaderboard entry
      const { error: leaderboardError } = await supabase
        .from('leaderboard')
        .insert([{
          mantri_id: mantriProfile.id,
          total_points: 0,
          tasks_completed: 0,
          rank_position: null
        }]);

      if (leaderboardError) {
        console.warn('⚠️ Leaderboard entry creation warning:', leaderboardError);
        // Don't fail registration if leaderboard creation fails
      }

      // Update last login
      await supabase
        .from('auth_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', authUser.id);

      const user: AuthUser = {
        id: authUser.id,
        email: authUser.email,
        isActive: true,
        createdAt: authUser.created_at,
        lastLogin: new Date().toISOString()
      };

      this.currentUser = user;
      localStorage.setItem('auth_user', JSON.stringify(user));

      return { success: true, user };

    } catch (error: any) {
      console.error('❌ Registration process error:', error);
      return { success: false, error: error.message || 'Registration failed' };
    }
  }

  // Login campus mantri using custom auth system
  async login(credentials: LoginCredentials): Promise<{ success: boolean; error?: string; user?: AuthUser }> {
    try {

      // Validate input
      if (!credentials.email || !credentials.password) {
        return { success: false, error: 'Email and password are required' };
      }

      // Find user in auth_users table
      const { data: authUser, error: authError } = await supabase
        .from('auth_users')
        .select('*')
        .eq('email', credentials.email)
        .eq('is_active', true)
        .maybeSingle();

      if (authError) {
        console.error('❌ Auth lookup error:', authError);
        return { success: false, error: 'Login failed' };
      }

      if (!authUser) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Verify password
      const passwordValid = await bcrypt.compare(credentials.password, authUser.password_hash);
      if (!passwordValid) {
        return { success: false, error: 'Invalid email or password' };
      }


      // Get campus mantri profile
      const { data: mantriData, error: mantriError } = await supabase
        .from('campus_mantris')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (mantriError) {
        console.error('❌ Error fetching mantri profile:', mantriError);
        return { success: false, error: 'Failed to load user profile' };
      }

      if (!mantriData) {
        // Try to find by email if user_id lookup fails
        const { data: mantriByEmail, error: emailError } = await supabase
          .from('campus_mantris')
          .select('*')
          .eq('email', credentials.email)
          .maybeSingle();

        if (emailError) {
          console.error('❌ Error fetching mantri by email:', emailError);
          return { success: false, error: 'Failed to load user profile' };
        }

        if (mantriByEmail) {
          // Update the user_id in the campus_mantris table
          const { error: updateError } = await supabase
            .from('campus_mantris')
            .update({ user_id: authUser.id })
            .eq('email', credentials.email);

          if (updateError) {
            console.warn('⚠️ Warning updating user_id:', updateError);
          }
        } else {
          return { success: false, error: 'Campus Mantri profile not found' };
        }
      }

      // Update last login
      await supabase
        .from('auth_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', authUser.id);

      const user: AuthUser = {
        id: authUser.id,
        email: authUser.email,
        isActive: authUser.is_active,
        createdAt: authUser.created_at,
        lastLogin: new Date().toISOString()
      };

      this.currentUser = user;
      localStorage.setItem('auth_user', JSON.stringify(user));

      return { success: true, user };

    } catch (error: any) {
      console.error('❌ Login error:', error);
      return { success: false, error: error.message || 'Login failed' };
    }
  }

  // Logout
  async logout(): Promise<void> {
    
    this.currentUser = null;
    localStorage.removeItem('auth_user');
  }

  // Get current user
  getCurrentUser(): AuthUser | null {
    if (this.currentUser) {
      return this.currentUser;
    }

    try {
      const stored = localStorage.getItem('auth_user');
      if (stored) {
        this.currentUser = JSON.parse(stored);
        return this.currentUser;
      }
    } catch (error) {
      console.error('❌ Error parsing stored user data:', error);
      localStorage.removeItem('auth_user');
    }

    return null;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  // Get campus mantri profile for current user
  async getCurrentMantriProfile() {
    const user = this.getCurrentUser();
    if (!user) return null;

    try {
      // First try to find by user_id
      const { data: mantriData, error: mantriError } = await supabase
        .from('campus_mantris')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (mantriError) {
        console.error('❌ Error fetching campus mantri profile by user_id:', mantriError);
      }

      if (mantriData) {
        return mantriData;
      }

      // If not found by user_id, try by email
      const { data: mantriByEmail, error: emailError } = await supabase
        .from('campus_mantris')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (emailError) {
        console.error('❌ Error fetching campus mantri profile by email:', emailError);
        return null;
      }

      if (mantriByEmail) {
        // Update user_id for future lookups
        await supabase
          .from('campus_mantris')
          .update({ user_id: user.id })
          .eq('email', user.email);

        return mantriByEmail;
      }

      return null;
    } catch (error) {
      console.error('❌ Error fetching campus mantri profile:', error);
      return null;
    }
  }

  // Initialize auth state from localStorage
  async initializeAuth(): Promise<AuthUser | null> {
    try {
      const stored = localStorage.getItem('auth_user');
      if (stored) {
        const user = JSON.parse(stored);
        
        // Verify user still exists and is active
        const { data: authUser } = await supabase
          .from('auth_users')
          .select('*')
          .eq('id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (authUser) {
          this.currentUser = user;
          return user;
        } else {
          // User no longer exists or is inactive, clear storage
          localStorage.removeItem('auth_user');
        }
      }
    } catch (error) {
      console.error('❌ Error initializing auth:', error);
      localStorage.removeItem('auth_user');
    }

    return null;
  }
}

export const authService = new AuthService();