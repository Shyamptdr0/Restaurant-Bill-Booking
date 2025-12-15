'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AuthGuard } from '@/components/auth-guard'
import { Sidebar } from '@/components/sidebar'
import { Navbar } from '@/components/navbar'
import { ArrowLeft, Plus, Trash2, Edit } from 'lucide-react'
import Link from 'next/link'

const categories = [
  'Appetizers',
  'Main Course',
  'Desserts',
  'Beverages',
  'Soups',
  'Salads',
  'Snacks',
  'Others'
]

export default function AddMenuItem() {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    tax: '0',
    status: 'active'
  })
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const router = useRouter()

  useEffect(() => {
    fetchMenuItems()
  }, [])

  const fetchMenuItems = async () => {
    try {
      const response = await fetch('/api/menu-items')
      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      setMenuItems(result.data || [])
    } catch (error) {
      console.error('Error fetching menu items:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editingItem ? '/api/menu-items' : '/api/menu-items'
      const method = editingItem ? 'PUT' : 'POST'
      
      const body = editingItem 
        ? { ...formData, id: editingItem.id }
        : formData

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      // Reset form
      setFormData({
        name: '',
        category: '',
        price: '',
        tax: '0',
        status: 'active'
      })
      setEditingItem(null)
      
      // Refresh list
      await fetchMenuItems()
    } catch (error) {
      console.error('Error saving menu item:', error)
      alert('Error saving menu item: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (item) => {
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price.toString(),
      tax: item.tax.toString(),
      status: item.status
    })
    setEditingItem(item)
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

  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="mb-6">
              <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900 mb-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">
                {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
              </h1>
              <p className="text-gray-600">Manage your restaurant menu items</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Add/Edit Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Plus className="h-5 w-5 mr-2" />
                    {editingItem ? 'Edit Item' : 'Add New Item'}
                  </CardTitle>
                  <CardDescription>
                    {editingItem ? 'Update menu item details' : 'Enter details for new menu item'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Item Name</Label>
                      <Input
                        id="name"
                        placeholder="Enter item name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="price">Price (₹)</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tax">Tax (%)</Label>
                        <Input
                          id="tax"
                          type="number"
                          step="0.1"
                          placeholder="0"
                          value={formData.tax}
                          onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex space-x-2">
                      <Button type="submit" disabled={loading} className="flex-1">
                        {loading ? 'Saving...' : editingItem ? 'Update Item' : 'Save Item'}
                      </Button>
                      {editingItem && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditingItem(null)
                            setFormData({
                              name: '',
                              category: '',
                              price: '',
                              tax: '0',
                              status: 'active'
                            })
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Menu Items List */}
              <Card>
                <CardHeader>
                  <CardTitle>Menu Items</CardTitle>
                  <CardDescription>Current menu items with quick actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {menuItems.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No menu items found</p>
                    ) : (
                      menuItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex-1">
                            <h4 className="font-medium">{item.name}</h4>
                            <p className="text-sm text-gray-600">
                              {item.category} • ₹{item.price.toFixed(2)}
                              {item.tax > 0 && ` • ₹${item.tax}% tax`}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant={item.status === 'active' ? 'default' : 'outline'}
                              onClick={() => toggleStatus(item)}
                            >
                              {item.status === 'active' ? 'Active' : 'Inactive'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
