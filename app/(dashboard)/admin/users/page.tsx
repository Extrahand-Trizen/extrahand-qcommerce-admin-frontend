'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Loader2,
  MoreHorizontal,
  Search,
  UserPlus,
  UserCheck,
  UserX,
  Trash2,
  Eye,
  Shield,
  ShieldAlert,
  Calendar,
  Clock,
  Mail,
  User as UserIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  listUsers,
  updateUser,
  deleteUser,
  createInvite,
  AdminUser,
  ROLE_LABELS,
  ADMIN_ROLES,
} from '@/lib/api/admin';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/useAuth';

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Dialog States
  const [viewUser, setViewUser] = useState<AdminUser | null>(null);
  const [roleDialog, setRoleDialog] = useState<{
    open: boolean;
    user: AdminUser | null;
    selectedRole: string;
  }>({
    open: false,
    user: null,
    selectedRole: '',
  });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    user: AdminUser | null;
  }>({
    open: false,
    user: null,
  });
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'CATALOGUE_ADMIN',
  });

  // Query users
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-users', page, search, roleFilter, statusFilter],
    queryFn: () =>
      listUsers({
        page,
        limit: 10,
        search: search.trim() || undefined,
        role: roleFilter,
        status: statusFilter,
      }),
  });

  // Update mutation (role, status)
  const updateMutation = useMutation({
    mutationFn: ({
      userId,
      updates,
    }: {
      userId: string;
      updates: { status?: string; role?: string; name?: string };
    }) => updateUser(userId, updates),
    onSuccess: (updatedUser, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      if (variables.updates.role) {
        toast.success(`Role updated to ${ROLE_LABELS[updatedUser.role] || updatedUser.role}`);
      } else if (variables.updates.status) {
        toast.success(`Admin status updated to ${updatedUser.status}`);
      } else {
        toast.success('Admin updated successfully');
      }
      setRoleDialog({ open: false, user: null, selectedRole: '' });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to update admin');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Admin user deleted successfully');
      setDeleteDialog({ open: false, user: null });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to delete admin user');
    },
  });

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: createInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-invites'] });
      toast.success('Invitation sent successfully');
      setInviteDialogOpen(false);
      setInviteForm({ name: '', email: '', role: 'CATALOGUE_ADMIN' });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to send invitation');
    },
  });

  const handleStatusToggle = (targetUser: AdminUser) => {
    const isSelf = targetUser.userId === currentUser?.userId || targetUser.id === currentUser?.id;
    if (isSelf) {
      toast.error('You cannot change your own account status');
      return;
    }

    const nextStatus = targetUser.status === 'active' ? 'inactive' : 'active';
    updateMutation.mutate({
      userId: targetUser.userId || targetUser.id,
      updates: { status: nextStatus },
    });
  };

  const handleRoleChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleDialog.user || !roleDialog.selectedRole) return;
    updateMutation.mutate({
      userId: roleDialog.user.userId || roleDialog.user.id,
      updates: { role: roleDialog.selectedRole },
    });
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      toast.error('Please provide name and email');
      return;
    }
    inviteMutation.mutate({
      name: inviteForm.name.trim(),
      email: inviteForm.email.trim(),
      role: inviteForm.role,
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100">
            Super Admin
          </Badge>
        );
      case 'CATALOGUE_ADMIN':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
            Catalogue Admin
          </Badge>
        );
      case 'SELLER_OPERATIONS_ADMIN':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
            Seller Operations Admin
          </Badge>
        );
      default:
        return <Badge variant="outline">{ROLE_LABELS[role] || role}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
            Active
          </Badge>
        );
      case 'suspended':
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50">
            Suspended
          </Badge>
        );
      case 'inactive':
      default:
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100">
            Inactive
          </Badge>
        );
    }
  };

  const users = data?.users || [];
  const pagination = data?.pagination || { total: 0, pages: 1, page: 1, limit: 10 };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Admin Users
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage administrators and their portal roles.
          </p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)} className="gap-2 shrink-0">
          <UserPlus className="h-4 w-4" />
          Invite Admin
        </Button>
      </div>

      {/* Filters Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>

            {/* Role Filter */}
            <div className="w-full md:w-56">
              <Select
                value={roleFilter}
                onValueChange={(val) => {
                  setRoleFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Roles</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  <SelectItem value="CATALOGUE_ADMIN">Catalogue Admin</SelectItem>
                  <SelectItem value="SELLER_OPERATIONS_ADMIN">Seller Operations Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-44">
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table Card */}
      <Card>
        <CardHeader className="py-4 px-6 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Administrators</CardTitle>
            <span className="text-xs text-muted-foreground">
              {pagination.total} {pagination.total === 1 ? 'user' : 'users'} found
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <UserIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-foreground">No admin users found</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Try adjusting your search criteria or invite a new administrator.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[260px]">Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined Date</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const isSelf =
                      u.userId === currentUser?.userId || u.id === currentUser?.id;
                    return (
                      <TableRow key={u.id || u.userId}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-amber-100 text-amber-900 font-semibold text-xs">
                                {u.name ? u.name.charAt(0).toUpperCase() : 'A'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {u.name}
                                {isSelf && (
                                  <span className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                    You
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.email}
                        </TableCell>
                        <TableCell>{getRoleBadge(u.role)}</TableCell>
                        <TableCell>{getStatusBadge(u.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(u.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => setViewUser(u)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  setRoleDialog({
                                    open: true,
                                    user: u,
                                    selectedRole: u.role === 'ADMIN' ? 'SUPER_ADMIN' : u.role,
                                  })
                                }
                              >
                                <Shield className="mr-2 h-4 w-4" />
                                Change Role
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusToggle(u)}
                                disabled={isSelf}
                              >
                                {u.status === 'active' ? (
                                  <>
                                    <UserX className="mr-2 h-4 w-4 text-amber-600" />
                                    <span>Deactivate</span>
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="mr-2 h-4 w-4 text-emerald-600" />
                                    <span>Activate</span>
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => setDeleteDialog({ open: true, user: u })}
                                disabled={isSelf}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Admin
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-6 py-4">
              <p className="text-xs text-muted-foreground">
                Page {pagination.page} of {pagination.pages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.pages || isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Admin Details Dialog */}
      <Dialog open={!!viewUser} onOpenChange={(open) => !open && setViewUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Admin User Details</DialogTitle>
            <DialogDescription>
              Profile and role permissions information for this administrator.
            </DialogDescription>
          </DialogHeader>
          {viewUser && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-amber-100 text-amber-900 font-bold text-base">
                    {viewUser.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-foreground text-base">{viewUser.name}</h3>
                  <p className="text-xs text-muted-foreground">{viewUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Assigned Role</span>
                  <div>{getRoleBadge(viewUser.role)}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Account Status</span>
                  <div>{getStatusBadge(viewUser.status)}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Joined On</span>
                  <p className="text-sm font-medium text-foreground">{formatDate(viewUser.createdAt)}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Last Login</span>
                  <p className="text-sm font-medium text-foreground">
                    {viewUser.lastLoginAt ? formatDateTime(viewUser.lastLoginAt) : 'Never logged in'}
                  </p>
                </div>
              </div>

              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-mono">User ID: {viewUser.userId || viewUser.id}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewUser(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog
        open={roleDialog.open}
        onOpenChange={(open) => !open && setRoleDialog({ open: false, user: null, selectedRole: '' })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Admin Role</DialogTitle>
            <DialogDescription>
              Assign a new administrative role to {roleDialog.user?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRoleChangeSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="role-select">Select New Role</Label>
              <Select
                value={roleDialog.selectedRole}
                onValueChange={(val) => setRoleDialog((prev) => ({ ...prev, selectedRole: val }))}
              >
                <SelectTrigger id="role-select">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  <SelectItem value="CATALOGUE_ADMIN">Catalogue Admin</SelectItem>
                  <SelectItem value="SELLER_OPERATIONS_ADMIN">Seller Operations Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRoleDialog({ open: false, user: null, selectedRole: '' })}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Role
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Admin Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => !open && setDeleteDialog({ open: false, user: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Administrator
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteDialog.user?.name}</strong> (
              {deleteDialog.user?.email})? This action cannot be undone and will permanently revoke
              their access to the Q-Commerce Admin Portal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (deleteDialog.user) {
                  deleteMutation.mutate(deleteDialog.user.userId || deleteDialog.user.id);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite Admin Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite New Administrator</DialogTitle>
            <DialogDescription>
              Send an email invitation with an activation link to join the admin team.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="invite-name">Full Name</Label>
              <Input
                id="invite-name"
                placeholder="e.g. John Doe"
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="admin@extrahand.in"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(val) => setInviteForm({ ...inviteForm, role: val })}
              >
                <SelectTrigger id="invite-role">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  <SelectItem value="CATALOGUE_ADMIN">Catalogue Admin</SelectItem>
                  <SelectItem value="SELLER_OPERATIONS_ADMIN">Seller Operations Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
