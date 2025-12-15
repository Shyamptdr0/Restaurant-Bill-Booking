'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AuthGuard } from '@/components/auth-guard'
import { Sidebar } from '@/components/sidebar'
import { Navbar } from '@/components/navbar'
import { ArrowLeft, Search, Edit, Trash2, Plus } from 'lucide-react'
import Link from 'next/link'

export default function MenuList() {
  const [menuItems, setMenuItems] = useState([])
  const [filteredItems, setFilteredItems] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMenuItems()
  }, [])

  useEffect(() => {
    filterItems()
  }, [menuItems, searchTerm, categoryFilter, statusFilter])

  const fetchMenuItems = async () => {
    try {
      const response = await fetch('/api/menu-items')
      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }
      
      setMenuItems(result.data || [])
      
      // Extract unique categories
      const uniqueCategories = [...new Set(result.data?.map(item => item.category) || [])]
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Error fetching menu items:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterItems = () => {
    let filtered = menuItems

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter)
    }

    setFilteredItems(filtered)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const response = await fetch(`/api/menu-items?id=₹{id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      await fetchMenuItems()
    } catch (error) {
      console.error('Error deleting menu item:', error)
      alert('Error deleting menu item: ' + error.message)
    }
  }

  const toggleStatus = async (item) => {
    try {
      const newStatus = item.status === 'active' ? 'inactive' : 'active'
      
      const response = await fetch('/api/menu-items', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...item,
          status: newStatus
        }),
      })

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      await fetchMenuItems()
    } catch (error) {
      console.error('Error toggling status:', error)
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900 mb-2">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Link>
                  <h1 className="text-3xl font-bold text-gray-900">Menu List</h1>
                  <p className="text-gray-600">View and manage all menu items</p>
                </div>
                <Link href="/menu/add">
                  <Button className="flex items-center">
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Item
                  </Button>
                </Link>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search menu items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Menu Items ({filteredItems.length})</CardTitle>
                <CardDescription>
                  {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} found
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredItems.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No menu items found</p>
                    <Link href="/menu/add" className="mt-4 inline-block">
                      <Button>Add your first menu item</Button>
                    </Link>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Tax</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>₹{item.price.toFixed(2)}</TableCell>
                          <TableCell>{item.tax}%</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant={item.status === 'active' ? 'default' : 'outline'}
                              onClick={() => toggleStatus(item)}
                            >
                              {item.status === 'active' ? 'Active' : 'Inactive'}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Link href={`/menu/add?edit=₹{item.id}`}>
                                <Button size="sm" variant="outline">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
