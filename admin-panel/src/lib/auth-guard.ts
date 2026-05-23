import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase-admin'

export interface AuthContext {
  userId: string
  email: string
  role: string
  permissions: string[]
}

/**
 * Validates the JWT token and optionally checks for a specific permission.
 * Merges role-level permissions WITH per-user extra permissions.
 * Returns the AuthContext if valid, or a NextResponse error if invalid.
 */
export async function validateAuth(
  req: NextRequest, 
  requiredPermission?: string
): Promise<{ context?: AuthContext; error?: NextResponse }> {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('[auth-guard] Missing Authorization header');
      return { error: NextResponse.json({ error: 'Missing authorization token' }, { status: 401 }) }
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.error('[auth-guard] Supabase Auth Error:', authError?.message || 'No user found');
      return { error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }) }
    }

    // Fetch user profile with role AND individual extra permissions
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        role: {
          include: { permissions: true }
        },
        permissions: true  // ← Individual extra permissions per user
      }
    })

    if (!profile) {
      console.error('[auth-guard] User profile not found in Prisma for ID:', user.id);
      return { error: NextResponse.json({ error: 'User profile not found' }, { status: 404 }) }
    }

    if (!profile.isActive) {
      return { error: NextResponse.json({ error: 'User account is deactivated' }, { status: 403 }) }
    }

    // Merge role permissions + individual extra permissions (deduplicated)
    const rolePermNames = profile.role?.permissions.map(p => p.name) || []
    const extraPermNames = profile.permissions.map(p => p.name) || []
    const permissions = Array.from(new Set([...rolePermNames, ...extraPermNames]))
    
    console.log('[auth-guard] DEBUG:', {
      email: profile.email,
      role: profile.role?.name || 'NO ROLE',
      permissionsCount: permissions.length,
      allPermissions: permissions
    });

    // Check for specific permission if required
    if (requiredPermission) {
      let hasPermission = permissions.includes(requiredPermission);
      
      // Self-healing fallback for lead/leads singular vs plural permission mismatches
      if (!hasPermission) {
        if (requiredPermission.startsWith('leads.')) {
          const singular = requiredPermission.replace('leads.', 'lead.');
          hasPermission = permissions.includes(singular);
        } else if (requiredPermission.startsWith('lead.')) {
          const plural = requiredPermission.replace('lead.', 'leads.');
          hasPermission = permissions.includes(plural);
        }
      }

      if (!hasPermission) {
        return { error: NextResponse.json({ error: `Missing required permission: ${requiredPermission}` }, { status: 403 }) }
      }
    }

    return {
      context: {
        userId: profile.id,
        email: profile.email,
        role: profile.role?.name || 'No Role',
        permissions
      }
    }
  } catch (error: any) {
    console.error('[auth-guard] CRITICAL ERROR:', error)
    return { 
      error: NextResponse.json({ 
        error: 'Internal Server Error during authorization',
        details: error?.message || 'Unknown error'
      }, { status: 500 }) 
    }
  }
}
