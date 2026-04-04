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
import { ArrowLeft, Plus, Trash2, Edit, Package, AlertCircle, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
  const [menuItems, setMenuItems] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    status: 'active',
    track_inventory: false,
    stock_quantity: '0'
  })
  const [loading, setLoading] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const router = useRouter()

  // Debug: Log state changes
  console.log('Add Menu: Current menuItems state:', menuItems)

  useEffect(() => {
    fetchMenuItems()
  }, [])

  // Smart logic: Auto-enable inventory for specific categories
  useEffect(() => {
    if ((formData.category === 'Desserts' || formData.category === 'Beverages') && !editingItem) {
      setFormData(prev => ({ ...prev, track_inventory: true }));
    }
  }, [formData.category, editingItem]);

  const fetchMenuItems = async () => {
    try {
      console.log('Add Menu: Fetching menu items...')
      const response = await fetch('/api/menu-items')
      console.log('Add Menu: Response status:', response.status)
      const result = await response.json()
      console.log('Add Menu: API Response:', result)
      setMenuItems(result.data || [])
      console.log('Add Menu: Menu items set:', result.data || [])
    } catch (error) {
      console.error('Add Menu: Error fetching menu items:', error)
      setMenuItems([])
    }
  }

  const filteredMenuItems = menuItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formDataWithId = editingItem 
        ? { ...formData, id: editingItem.id }
        : formData

      if (editingItem) {
        // Update existing item
        const response = await fetch('/api/menu-items', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formDataWithId)
        })
        const result = await response.json()
        if (result.error) throw new Error(result.error)
      } else {
        // Create new item
        const response = await fetch('/api/menu-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formDataWithId)
        })
        const result = await response.json()
        if (result.error) throw new Error(result.error)
      }

      // Reset form
      setFormData({
        name: '',
        category: '',
        price: '',
        status: 'active',
        track_inventory: false,
        stock_quantity: '0'
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
      status: item.status,
      track_inventory: item.track_inventory || false,
      stock_quantity: (item.stock_quantity || 0).toString()
    });
    setEditingItem(item);
  };

  const handleDelete = async (id) => {
  if (!confirm('Are you sure you want to delete this item?')) return;

  try {
    const response = await fetch(`/api/menu-items?id=${id}`, {
      method: 'DELETE',
    });

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    await fetchMenuItems();
  } catch (error) {
    console.error('Error deleting menu item:', error);
    alert('Error deleting menu item: ' + error.message);
  }
};

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
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex h-full w-64 flex-col bg-gray-50 border-r">
          <Sidebar />
        </div>
        
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            <div className="mb-4 lg:mb-6">
              <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900 mb-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
              </h1>
              <p className="text-gray-600 text-sm lg:text-base">Manage your restaurant menu items</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
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

                    <div className="pt-4 border-t space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Track Inventory</Label>
                          <p className="text-sm text-gray-500">Enable stock management for this item</p>
                        </div>
                        <input
                          type="checkbox"
                          className="h-6 w-11 rounded-full bg-gray-200 checked:bg-orange-600 appearance-none cursor-pointer relative after:content-[''] after:absolute after:top-1 after:left-1 after:h-4 after:w-4 after:bg-white after:rounded-full after:transition-all checked:after:left-6"
                          checked={formData.track_inventory}
                          onChange={(e) => setFormData({ ...formData, track_inventory: e.target.checked })}
                        />
                      </div>

                      {formData.track_inventory && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                          <Label htmlFor="stock_quantity">Initial Stock Quantity</Label>
                          <div className="relative">
                            <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              id="stock_quantity"
                              type="number"
                              className="pl-10"
                              placeholder="0"
                              value={formData.stock_quantity}
                              onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                              required={formData.track_inventory}
                            />
                          </div>
                          {(formData.category === 'Desserts' || formData.category === 'Beverages') && (
                            <p className="text-xs text-orange-600 flex items-center mt-1">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Recommended for {formData.category}
                            </p>
                          )}
                        </div>
                      )}
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
                              status: 'active',
                              track_inventory: false,
                              stock_quantity: '0'
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle>Menu Items</CardTitle>
                      <CardDescription>Current menu items with quick actions</CardDescription>
                    </div>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search menu items..."
                        className="pl-9 h-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                    {filteredMenuItems.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        {searchTerm ? "No matching items found" : "No menu items found"}
                      </p>
                    ) : (
                      filteredMenuItems.map((item) => (
                        <div
                          key={item.id}
                          className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-xl hover:bg-gray-50 transition-all gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate">{item.name}</h4>
                            <p className="text-xs text-gray-500 font-medium">
                              {item.category} • ₹{item.price.toFixed(2)}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 sm:gap-6">
                            {/* Stock Column */}
                            <div className="min-w-[80px] text-center sm:text-right">
                              {item.track_inventory ? (
                                <div className="flex flex-col items-center sm:items-end">
                                  <span className={`text-sm font-bold ₹{
                                    item.stock_quantity <= 0 ? 'text-red-500' : 
                                    item.stock_quantity <= 5 ? 'text-orange-500' : 'text-gray-900'
                                  }`}>
                                    {item.stock_quantity}
                                  </span>
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Stock</span>
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold italic text-gray-300 uppercase tracking-widest">N/A</span>
                              )}
                            </div>

                            <div className="h-6 w-[1px] bg-gray-100 hidden sm:block" />

                            <div className="flex items-center space-x-1.5">
                              <Button
                                size="sm"
                                variant={item.status === 'active' ? 'default' : 'outline'}
                                className="h-8 px-3 text-[10px] font-bold uppercase"
                                onClick={() => toggleStatus(item)}
                              >
                                {item.status === 'active' ? 'Active' : 'Inactive'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-200"
                                onClick={() => handleEdit(item)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-200 hover:text-red-600 hover:border-red-100 transition-all shadow-sm"
                                onClick={() => handleDelete(item.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
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
