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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Plus,
  RefreshCw,
  XCircle,
  Mail,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  listInvites,
  createInvite,
  resendInvite,
  cancelInvite,
  AdminInvite,
  ROLE_LABELS,
} from '@/lib/api/admin';
import { formatDate } from '@/lib/utils';

export default function AdminInvitesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeResendId, setActiveResendId] = useState<string | null>(null);
  const [activeCancelId, setActiveCancelId] = useState<string | null>(null);

  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'CATALOGUE_ADMIN',
  });

  const queryClient = useQueryClient();

  // Fetch Invites
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-invites', page, statusFilter, search],
    queryFn: () =>
      listInvites({
        page,
        limit: 10,
        status: statusFilter,
        search: search.trim() || undefined,
      }),
  });

  // Create Invite Mutation
  const createMutation = useMutation({
    mutationFn: createInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invites'] });
      setIsCreateOpen(false);
      setInviteForm({ name: '', email: '', role: 'CATALOGUE_ADMIN' });
      toast.success('Invitation sent successfully');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to send invitation');
    },
  });

  // Resend Mutation
  const resendMutation = useMutation({
    mutationFn: (inviteId: string) => resendInvite(inviteId),
    onMutate: (inviteId) => setActiveResendId(inviteId),
    onSuccess: () => {
      toast.success('Invitation email resent successfully');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to resend invitation');
    },
    onSettled: () => setActiveResendId(null),
  });

  // Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: (inviteId: string) => cancelInvite(inviteId),
    onMutate: (inviteId) => setActiveCancelId(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invites'] });
      toast.success('Invitation cancelled');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to cancel invitation');
    },
    onSettled: () => setActiveCancelId(null),
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      toast.error('Please enter name and email');
      return;
    }

    createMutation.mutate({
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
      case 'accepted':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
            Accepted
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">
            Pending
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100">
            Expired
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50">
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const invites = data?.invites || [];
  const pagination = data?.pagination || { total: 0, pages: 1, page: 1, limit: 10 };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Admin Invitations
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Send and manage invitations for new portal administrators.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Invite New Admin
        </Button>
      </div>

      {/* Filters Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
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
            <div className="w-full sm:w-48">
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invitations Table Card */}
      <Card>
        <CardHeader className="py-4 px-6 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Invitation History</CardTitle>
            <span className="text-xs text-muted-foreground">
              {pagination.total} {pagination.total === 1 ? 'invitation' : 'invitations'} total
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : invites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Mail className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-foreground">No invitations found</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Click "Invite New Admin" to send an activation email to a colleague.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Invited By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent Date</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((invite) => (
                    <TableRow key={invite.inviteId || invite.id}>
                      <TableCell className="font-medium text-foreground">
                        {invite.name || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {invite.email}
                      </TableCell>
                      <TableCell>{getRoleBadge(invite.role)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {invite.invitedByName || 'Administrator'}
                      </TableCell>
                      <TableCell>{getStatusBadge(invite.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(invite.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(invite.expiresAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {invite.status === 'pending' && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Resend Invitation Email"
                              onClick={() => resendMutation.mutate(invite.inviteId)}
                              disabled={activeResendId === invite.inviteId}
                              className="h-8 px-2 text-xs"
                            >
                              <RefreshCw
                                className={`h-3.5 w-3.5 mr-1 ${
                                  activeResendId === invite.inviteId ? 'animate-spin' : ''
                                }`}
                              />
                              Resend
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Cancel Invitation"
                              onClick={() => cancelMutation.mutate(invite.inviteId)}
                              disabled={activeCancelId === invite.inviteId}
                              className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
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

      {/* Invite Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Admin Invitation</DialogTitle>
            <DialogDescription>
              Invite a new user to access the ExtraHand Q-Commerce Admin Portal.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="create-name">Full Name</Label>
              <Input
                id="create-name"
                placeholder="e.g. Sarah Connor"
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email Address</Label>
              <Input
                id="create-email"
                type="email"
                placeholder="sarah@extrahand.in"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-role">Assigned Role</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(val) => setInviteForm({ ...inviteForm, role: val })}
              >
                <SelectTrigger id="create-role">
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
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
