'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldAlert, Users, FolderTree, Store, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';

export default function SuperAdminSettingsPage() {
  const { user } = useAuth();

  const roleDefinitions = [
    {
      role: 'Super Admin',
      code: 'SUPER_ADMIN',
      badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: Shield,
      description:
        'Complete administrative authority across the entire platform. Has access to all catalogue and seller operations, and is the only role authorized to manage admin users, roles, and invitations.',
      capabilities: [
        'User & Role Management',
        'Send & Manage Admin Invitations',
        'Full Catalogue Administration',
        'Seller & Store Operations',
        'Orders & Product Submissions',
      ],
    },
    {
      role: 'Catalogue Admin',
      code: 'CATALOGUE_ADMIN',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: FolderTree,
      description:
        'Dedicated to managing the core product catalogue structure, master products, and taxonomy.',
      capabilities: [
        'Categories & Subcategories Management',
        'Product Types & Custom Attributes',
        'Master Products Catalogue',
        'Product Submission Reviews',
      ],
    },
    {
      role: 'Seller Operations Admin',
      code: 'SELLER_OPERATIONS_ADMIN',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: Store,
      description:
        'Focused on merchant onboarding, store listings verification, document compliance, and daily operations.',
      capabilities: [
        'Seller Account Verification & KYC',
        'Store Approvals & Onboarding Workflow',
        'Seller Listings & Stock Review',
        'Store Location & Metadata Management',
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Super Admin Settings
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Overview of platform administrative roles, privileges, and system configurations.
        </p>
      </div>

      {/* Current Admin Card */}
      <Card className="bg-gradient-to-r from-amber-50/50 via-white to-transparent border-amber-200/70">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-700">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Active Role:</span>
              <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                Super Admin
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role Definitions */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Role Hierarchy & Privileges</h3>
          <p className="text-xs text-muted-foreground">
            The portal enforces three distinct administrative roles.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {roleDefinitions.map((item) => (
            <Card key={item.code} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-md bg-muted">
                    <item.icon className="h-5 w-5 text-foreground" />
                  </div>
                  <Badge className={item.badgeClass}>{item.role}</Badge>
                </div>
                <CardTitle className="text-base font-semibold mt-2">{item.role}</CardTitle>
                <CardDescription className="text-xs">{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pt-0">
                <div className="pt-3 border-t border-border space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Responsibilities
                  </span>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {item.capabilities.map((cap) => (
                      <li key={cap} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
