import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Edit2, Crown, Calendar, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import {
  getAdminUsers,
  getAdminUserDetail,
  getAdminUserActivity,
  updateAdminUserSubscription,
  resetAdminUserTrial,
  cancelAdminUserSubscription,
  type AdminUser,
  type AdminUserDetail,
  type UserActivityItem,
} from '@/lib/api';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UserManagementProps {
  token: string;
}

export function UserManagement({ token }: UserManagementProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    tier: 'all',
    authProvider: 'all',
    search: '',
  });
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivityItem[]>([]);
  const [loadingUser, setLoadingUser] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState({
    subscriptionTier: 'free' as 'free' | 'premium' | 'pro',
    subscriptionExpiresAt: '',
    hasUsedFreeTrial: false,
  });
  const { toast } = useToast();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await getAdminUsers(token, {
        page,
        limit: 50,
        tier: filters.tier !== 'all' ? filters.tier : undefined,
        authProvider: filters.authProvider !== 'all' ? filters.authProvider : undefined,
        search: filters.search || undefined,
      });
      setUsers(response.users);
      setTotalPages(response.pagination.totalPages);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load users',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, [page, filters.tier, filters.authProvider]);

  const handleSearch = () => {
    setPage(1);
    loadUsers();
  };

  const handleUserClick = async (user: AdminUser) => {
    setLoadingUser(true);
    setSelectedUser(null);
    setUserActivity([]);
    try {
      const [userDetail, activity] = await Promise.all([
        getAdminUserDetail(token, user.id),
        getAdminUserActivity(token, user.id),
      ]);
      setSelectedUser(userDetail);
      setUserActivity(activity.activity);
      setSubscriptionData({
        subscriptionTier: userDetail.subscriptionTier as 'free' | 'premium' | 'pro',
        subscriptionExpiresAt: userDetail.subscriptionExpiresAt
          ? format(new Date(userDetail.subscriptionExpiresAt), 'yyyy-MM-dd')
          : '',
        hasUsedFreeTrial: userDetail.hasUsedFreeTrial,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load user details',
        variant: 'destructive',
      });
    }
    setLoadingUser(false);
  };

  const handleUpdateSubscription = async () => {
    if (!selectedUser) return;
    setEditingSubscription(false);
    try {
      await updateAdminUserSubscription(token, selectedUser.id, {
        subscriptionTier: subscriptionData.subscriptionTier,
        subscriptionExpiresAt: subscriptionData.subscriptionExpiresAt || null,
        hasUsedFreeTrial: subscriptionData.hasUsedFreeTrial,
      });
      toast({
        title: 'Success',
        description: 'Subscription updated successfully',
      });
      await handleUserClick(selectedUser as AdminUser);
      loadUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update subscription',
        variant: 'destructive',
      });
    }
  };

  const handleResetTrial = async () => {
    if (!selectedUser) return;
    if (!confirm('Reset free trial for this user?')) return;
    try {
      await resetAdminUserTrial(token, selectedUser.id);
      toast({
        title: 'Success',
        description: 'Free trial reset successfully',
      });
      await handleUserClick(selectedUser as AdminUser);
      loadUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset trial',
        variant: 'destructive',
      });
    }
  };

  const handleCancelSubscription = async () => {
    if (!selectedUser) return;
    if (!confirm('Cancel subscription for this user? This will downgrade them to Free.')) return;
    try {
      await cancelAdminUserSubscription(token, selectedUser.id);
      toast({
        title: 'Success',
        description: 'Subscription canceled successfully',
      });
      await handleUserClick(selectedUser as AdminUser);
      loadUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel subscription',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Search</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Email or name..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} size="icon">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div>
            <Label>Subscription Tier</Label>
            <Select
              value={filters.tier}
              onValueChange={(value) => {
                setFilters({ ...filters, tier: value });
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Auth Provider</Label>
            <Select
              value={filters.authProvider}
              onValueChange={(value) => {
                setFilters({ ...filters, authProvider: value });
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="anonymous">Anonymous</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={loadUsers} variant="outline" className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-semibold text-lg">Users ({users.length})</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No users found</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {users.map((user) => (
              <div
                key={user.id}
                className="p-4 hover:bg-slate-50 cursor-pointer"
                onClick={() => handleUserClick(user)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900">
                        {user.displayName || user.email || 'Anonymous User'}
                      </span>
                      <Badge
                        className={
                          user.subscriptionTier === 'pro'
                            ? 'bg-amber-600 text-white'
                            : user.subscriptionTier === 'premium'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-600 text-white'
                        }
                      >
                        {user.subscriptionTier}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {user.authProvider}
                      </Badge>
                    </div>
                    <div className="text-sm text-slate-500">
                      {user.email && <span>{user.email} • </span>}
                      {user.totalAttempts} attempts • Created {format(new Date(user.createdAt), 'MMM d, yyyy')}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-slate-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {loadingUser ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
            </div>
          ) : selectedUser ? (
            <>
              <DialogHeader>
                <DialogTitle>User Details</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="details" className="mt-4">
                <TabsList>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="subscription">Subscription</TabsTrigger>
                  <TabsTrigger value="activity">Activity Log</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Email</Label>
                      <div className="text-sm text-slate-900">{selectedUser.email || 'N/A'}</div>
                    </div>
                    <div>
                      <Label>Display Name</Label>
                      <div className="text-sm text-slate-900">{selectedUser.displayName || 'N/A'}</div>
                    </div>
                    <div>
                      <Label>Auth Provider</Label>
                      <div className="text-sm text-slate-900">{selectedUser.authProvider}</div>
                    </div>
                    <div>
                      <Label>Account Created</Label>
                      <div className="text-sm text-slate-900">
                        {format(new Date(selectedUser.createdAt), 'MMM d, yyyy')}
                      </div>
                    </div>
                    {selectedUser.birthday && (
                      <div>
                        <Label>Birthday</Label>
                        <div className="text-sm text-slate-900">
                          {format(new Date(selectedUser.birthday), 'MMM d, yyyy')}
                        </div>
                      </div>
                    )}
                    {selectedUser.incomeBracket && (
                      <div>
                        <Label>Income Bracket</Label>
                        <div className="text-sm text-slate-900">{selectedUser.incomeBracket}</div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="subscription" className="space-y-4 mt-4">
                  {!editingSubscription ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Subscription Tier</Label>
                          <div className="mt-1">
                            <Badge
                              className={
                                selectedUser.subscriptionTier === 'pro'
                                  ? 'bg-amber-600 text-white'
                                  : selectedUser.subscriptionTier === 'premium'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-600 text-white'
                              }
                            >
                              {selectedUser.subscriptionTier}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <Label>Expires At</Label>
                          <div className="text-sm text-slate-900 mt-1">
                            {selectedUser.subscriptionExpiresAt
                              ? format(new Date(selectedUser.subscriptionExpiresAt), 'MMM d, yyyy')
                              : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <Label>Has Used Free Trial</Label>
                          <div className="mt-1">
                            {selectedUser.hasUsedFreeTrial ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        </div>
                        <div>
                          <Label>Stripe Customer ID</Label>
                          <div className="text-sm text-slate-500 font-mono mt-1">
                            {selectedUser.stripeCustomerId || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <Label>Stripe Subscription ID</Label>
                          <div className="text-sm text-slate-500 font-mono mt-1">
                            {selectedUser.stripeSubscriptionId || 'N/A'}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-4 border-t">
                        <Button onClick={() => setEditingSubscription(true)}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit Subscription
                        </Button>
                        {selectedUser.subscriptionTier !== 'free' && (
                          <Button variant="outline" onClick={handleCancelSubscription}>
                            Cancel Subscription
                          </Button>
                        )}
                        <Button variant="outline" onClick={handleResetTrial}>
                          Reset Free Trial
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label>Subscription Tier</Label>
                        <Select
                          value={subscriptionData.subscriptionTier}
                          onValueChange={(value: 'free' | 'premium' | 'pro') =>
                            setSubscriptionData({ ...subscriptionData, subscriptionTier: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Expires At</Label>
                        <Input
                          type="date"
                          value={subscriptionData.subscriptionExpiresAt}
                          onChange={(e) =>
                            setSubscriptionData({ ...subscriptionData, subscriptionExpiresAt: e.target.value })
                          }
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="hasUsedFreeTrial"
                          checked={subscriptionData.hasUsedFreeTrial}
                          onChange={(e) =>
                            setSubscriptionData({ ...subscriptionData, hasUsedFreeTrial: e.target.checked })
                          }
                          className="w-4 h-4"
                        />
                        <Label htmlFor="hasUsedFreeTrial">Has Used Free Trial</Label>
                      </div>
                      {selectedUser.stripeSubscriptionId && (
                        <div className="bg-amber-50 border border-amber-200 p-3 rounded text-sm text-amber-800">
                          <strong>Note:</strong> This user has an active Stripe subscription. Changes will be synced with Stripe.
                        </div>
                      )}
                      <div className="flex gap-2 pt-4 border-t">
                        <Button onClick={handleUpdateSubscription}>
                          <Crown className="w-4 h-4 mr-2" />
                          Save Changes
                        </Button>
                        <Button variant="outline" onClick={() => setEditingSubscription(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="activity" className="mt-4">
                  <div className="space-y-2">
                    {userActivity.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">No activity recorded</div>
                    ) : (
                      <div className="border rounded-lg divide-y divide-slate-100">
                        {userActivity.map((item) => (
                          <div key={item.id} className="p-3 hover:bg-slate-50">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-slate-900">{item.challengeTitle}</span>
                                  {item.isBestAttempt && (
                                    <Badge variant="outline" className="text-xs">
                                      Best
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-slate-500">
                                  {item.dateKey && (
                                    <span>
                                      {format(new Date(item.dateKey + 'T00:00:00'), 'MMM d, yyyy')} •{' '}
                                    </span>
                                  )}
                                  {item.challengeCategory} • Score: {item.score} • {item.gradeTier}
                                </div>
                              </div>
                              <div className="text-xs text-slate-400">
                                {format(new Date(item.submittedAt), 'MMM d, h:mm a')}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

