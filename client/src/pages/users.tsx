import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface UsersProps {
  toggleSidebar?: () => void;
}

export default function Users({ toggleSidebar }: UsersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("viewer");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch users
  const { data: users, isLoading } = useQuery({
    queryKey: ['/api/users'],
  });
  
  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/users', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      resetForm();
      toast({
        title: "Utente creato",
        description: "L'utente è stato creato con successo"
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error}`,
        variant: "destructive"
      });
    }
  });
  
  // Reset form fields
  const resetForm = () => {
    setNewUsername("");
    setNewName("");
    setNewEmail("");
    setNewPassword("");
    setNewRole("viewer");
  };
  
  // Handle creating a new user
  const handleCreateUser = () => {
    if (!newUsername || !newName || !newEmail || !newPassword) {
      toast({
        title: "Errore",
        description: "Tutti i campi sono obbligatori",
        variant: "destructive"
      });
      return;
    }
    
    createUserMutation.mutate({
      username: newUsername,
      name: newName,
      email: newEmail,
      password: newPassword,
      role: newRole
    });
  };
  
  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch(role) {
      case "admin": return "bg-error bg-opacity-10 text-error";
      case "editor": return "bg-warning bg-opacity-10 text-warning";
      case "translator": return "bg-success bg-opacity-10 text-success";
      case "reader": return "bg-info bg-opacity-10 text-info";
      default: return "bg-neutral-light text-neutral-dark";
    }
  };
  
  // Get role display name
  const getRoleDisplayName = (role: string) => {
    switch(role) {
      case "admin": return "Amministratore";
      case "editor": return "Editore";
      case "translator": return "Traduttore";
      case "reader": return "Lettore";
      default: return role;
    }
  };
  
  // Filter users based on search query
  const filteredUsers = users && Array.isArray(users) ? 
    users.filter((user: any) => 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    ) : [];
  
  return (
    <>
      <Header title="Gestione Utenti" toggleSidebar={toggleSidebar} />
      
      <main className="flex-1 overflow-y-auto bg-neutral-lightest p-6">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Utenti</CardTitle>
              <div className="flex space-x-2">
                <div className="relative">
                  <Input
                    placeholder="Cerca utenti..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  <span className="material-icons absolute left-3 top-2 text-neutral-medium">search</span>
                </div>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <span className="material-icons text-sm mr-1">person_add</span>
                      Nuovo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crea Nuovo Utente</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div>
                        <Label htmlFor="user-username">Username</Label>
                        <Input 
                          id="user-username" 
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          placeholder="username"
                        />
                      </div>
                      <div>
                        <Label htmlFor="user-name">Nome completo</Label>
                        <Input 
                          id="user-name"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="Nome Cognome"
                        />
                      </div>
                      <div>
                        <Label htmlFor="user-email">Email</Label>
                        <Input 
                          id="user-email"
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="email@example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="user-password">Password</Label>
                        <Input 
                          id="user-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                        />
                      </div>
                      <div>
                        <Label htmlFor="user-role">Ruolo</Label>
                        <Select value={newRole} onValueChange={setNewRole}>
                          <SelectTrigger id="user-role">
                            <SelectValue placeholder="Seleziona ruolo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Amministratore</SelectItem>
                            <SelectItem value="editor">Editore</SelectItem>
                            <SelectItem value="translator">Traduttore</SelectItem>
                            <SelectItem value="reader">Lettore</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateUser}>Crea Utente</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utente</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Ruolo</TableHead>
                    <TableHead className="w-[100px]">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        Caricamento utenti...
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length > 0 ? (
                    filteredUsers.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-neutral-medium">@{user.username}</div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {getRoleDisplayName(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <span className="material-icons text-sm">edit</span>
                          </Button>
                          <Button variant="ghost" size="sm">
                            <span className="material-icons text-sm">delete</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-neutral-medium">
                        {searchQuery ? 
                          `Nessun risultato per "${searchQuery}"` : 
                          "Nessun utente disponibile"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
