import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Layout } from "../components/Layout";
import api from "../services/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { ScrollbarVertical } from "../components/ui/scrollbar";
import {
  Trash2,
  Edit,
  Plus,
  User,
  Shield,
  Crown,
  Loader2,
  BookOpen,
} from "lucide-react";
import { toast } from "../hooks/use-toast";
import { UsersPageSkeleton } from "../components/skeletons/UsersPageSkeleton";

interface CreatedByUser {
  id: number;
  username: string;
  full_name: string;
  role: string;
}

interface AdminUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: "superadmin" | "admin";
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: CreatedByUser | null;
}

interface CreateUserData {
  username: string;
  email: string;
  password: string;
  full_name: string;
  role: "admin";
}

interface UpdateUserData {
  username: string;
  email: string;
  password?: string;
  full_name: string;
  is_active: boolean;
}

const Users: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState<CreateUserData>({
    username: "",
    email: "",
    password: "",
    full_name: "",
    role: "admin",
  });

  const [editForm, setEditForm] = useState<UpdateUserData>({
    username: "",
    email: "",
    password: "",
    full_name: "",
    is_active: true,
  });

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/users/list/");
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Create user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      await api.post("/api/users/create-user/", createForm);
      toast({
        title: "Success",
        description: "User created successfully",
      });
      setIsCreateDialogOpen(false);
      setCreateForm({
        username: "",
        email: "",
        password: "",
        full_name: "",
        role: "admin",
      });
      fetchUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Update user
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setIsUpdating(true);

      // Create update data, only include password if it's not empty
      const updateData: UpdateUserData = {
        username: editForm.username,
        email: editForm.email,
        full_name: editForm.full_name,
        is_active: editForm.is_active,
      };

      // Only include password if it's not empty
      if (editForm.password && editForm.password.trim() !== "") {
        updateData.password = editForm.password;
      }

      console.log("Sending update data:", updateData);
      await api.put(`/api/users/update-user/${editingUser.id}/`, updateData);
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setIsDeleting(userToDelete.id);
      await api.delete(`/api/users/delete-user/${userToDelete.id}/`);
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      setUserToDelete(null);
      setIsDeleteDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  // Open delete confirmation
  const openDeleteConfirmation = (user: AdminUser) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (user: AdminUser) => {
    setEditingUser(user);
    setEditForm({
      username: user.username,
      email: user.email,
      password: "",
      full_name: user.full_name || "",
      is_active: user.is_active,
    });
    setIsEditDialogOpen(true);
  };

  // Check if user can edit/delete
  const canEditUser = (targetUser: AdminUser) => {
    // Superadmins cannot be edited by anyone except themselves
    if (targetUser.role === "superadmin") return targetUser.id === user?.id;
    // Superadmins can edit all other users
    if (user?.role === "super_admin") return true;
    // Regular admins can edit users they created or themselves
    return targetUser.created_by?.id === user?.id || targetUser.id === user?.id;
  };

  // Check if user can delete
  const canDeleteUser = (targetUser: AdminUser) => {
    // Superadmins cannot be deleted by anyone
    if (targetUser.role === "superadmin") return false;
    // Users cannot delete themselves
    if (targetUser.id === user?.id) return false;
    // Superadmins can delete all other users
    if (user?.role === "super_admin") return true;
    // Regular admins can only delete users they created
    return targetUser.created_by?.id === user?.id;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "superadmin":
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case "admin":
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "superadmin":
        return "default";
      case "admin":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (loading && users.length === 0) {
    return (
      <Layout>
        <UsersPageSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Admin Users</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Manage admin users and their permissions
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Create a new admin user. Only admins and superadmins can
                    create users.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateUser}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <Label htmlFor="username" className="sm:text-right">
                        Username
                      </Label>
                      <Input
                        id="username"
                        value={createForm.username}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            username: e.target.value,
                          })
                        }
                        className="sm:col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <Label htmlFor="email" className="sm:text-right">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={createForm.email}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            email: e.target.value,
                          })
                        }
                        className="sm:col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <Label htmlFor="password" className="sm:text-right">
                        Password
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={createForm.password}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            password: e.target.value,
                          })
                        }
                        className="sm:col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <Label htmlFor="full_name" className="sm:text-right">
                        Full Name
                      </Label>
                      <Input
                        id="full_name"
                        value={createForm.full_name}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            full_name: e.target.value,
                          })
                        }
                        className="sm:col-span-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="submit"
                      className="w-full sm:w-auto"
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Create User
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {users.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No users found
            </h3>
            <p className="text-gray-500">
              Get started by creating your first admin user.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {users.map((user) => (
              <Card key={user.id} className="w-full">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      {getRoleIcon(user.role)}
                      <div>
                        <CardTitle className="text-lg">
                          {user.full_name || user.username}
                        </CardTitle>
                        <CardDescription>@{user.username}</CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                      <Badge variant={user.is_active ? "default" : "secondary"}>
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 text-sm text-gray-600">
                    <div className="break-words">
                      <strong>Email:</strong> {user.email}
                    </div>
                    <div>
                      <strong>Created:</strong>{" "}
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                    <div>
                      <strong>Last Updated:</strong>{" "}
                      {new Date(user.updated_at).toLocaleDateString()}
                    </div>
                    <div className="break-words">
                      <strong>Created By:</strong>{" "}
                      {user.created_by
                        ? `${
                            user.created_by.full_name ||
                            user.created_by.username
                          }`
                        : "System"}
                    </div>
                  </div>
                  {(canEditUser(user) || canDeleteUser(user)) && (
                    <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
                      {canEditUser(user) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                          className="w-full sm:w-auto"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      )}
                      {canDeleteUser(user) && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openDeleteConfirmation(user)}
                          disabled={isDeleting === user.id}
                          className="w-full sm:w-auto"
                        >
                          {isDeleting === user.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="w-[95vw] max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information. You can edit users you created or
                yourself.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateUser}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                  <Label htmlFor="edit-username" className="sm:text-right">
                    Username
                  </Label>
                  <Input
                    id="edit-username"
                    value={editForm.username}
                    onChange={(e) =>
                      setEditForm({ ...editForm, username: e.target.value })
                    }
                    className="sm:col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                  <Label htmlFor="edit-email" className="sm:text-right">
                    Email
                  </Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    className="sm:col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                  <Label htmlFor="edit-password" className="sm:text-right">
                    Password
                  </Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={editForm.password}
                    onChange={(e) =>
                      setEditForm({ ...editForm, password: e.target.value })
                    }
                    className="sm:col-span-3"
                    placeholder="Leave blank to keep current password"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                  <Label htmlFor="edit-full_name" className="sm:text-right">
                    Full Name
                  </Label>
                  <Input
                    id="edit-full_name"
                    value={editForm.full_name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, full_name: e.target.value })
                    }
                    className="sm:col-span-3"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                  <Label htmlFor="edit-is_active" className="sm:text-right">
                    Status
                  </Label>
                  <Select
                    value={editForm.is_active ? "active" : "inactive"}
                    onValueChange={(value) =>
                      setEditForm({
                        ...editForm,
                        is_active: value === "active",
                      })
                    }
                  >
                    <SelectTrigger className="sm:col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update User"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                user{" "}
                <strong>
                  {userToDelete?.full_name || userToDelete?.username}
                </strong>{" "}
                and remove all their data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setUserToDelete(null);
                  setIsDeleteDialogOpen(false);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting !== null}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete User"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default Users;
