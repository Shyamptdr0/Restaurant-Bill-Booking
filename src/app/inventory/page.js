'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AuthGuard } from '@/components/auth-guard'
import { Sidebar } from '@/components/sidebar'
import { Navbar } from '@/components/navbar'
import { 
  Package, 
  Search, 
  Plus, 
  Minus, 
  AlertCircle, 
  Loader2,
  RefreshCw,
  Filter,
  ArrowLeft,
  ShoppingBag,
  Trash2
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import Link from 'next/link'

export default function InventoryPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [updatingId, setUpdatingId] = useState(null)
  const [adjustAmounts, setAdjustAmounts] = useState({})
  
  // New states for "Add from Menu"
  const [allMenuItems, setAllMenuItems] = useState([])
  const [searchMenuQuery, setSearchMenuQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [loadingMenu, setLoadingMenu] = useState(false)
  const [selectedMenuItem, setSelectedMenuItem] = useState(null)
  const [initialStock, setInitialStock] = useState('0')
  const [savingNewItem, setSavingNewItem] = useState(false)
  
  // States for "Remove from Inventory"
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [itemToRemove, setItemToRemove] = useState(null)
  const [removingItem, setRemovingItem] = useState(false)

  useEffect(() => {
    fetchInventory()
  }, [])

  const fetchInventory = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/menu-items')
      const result = await response.json()
      const allData = result.data || []
      setAllMenuItems(allData)
      const inventoryItems = allData.filter(item => item.track_inventory)
      setItems(inventoryItems)
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStock = async (item, amount, mode = 'add') => {
    setUpdatingId(item.id)
    try {
      let newStock = item.stock_quantity || 0
      const val = parseInt(amount) || 0
      
      if (mode === 'add') newStock += val
      else if (mode === 'sub') newStock = Math.max(0, newStock - val)
      else if (mode === 'set') newStock = Math.max(0, val)

      const response = await fetch('/api/menu-items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, stock_quantity: newStock })
      })
      
      if (response.ok) {
        setItems(items.map(i => i.id === item.id ? { ...i, stock_quantity: newStock } : i))
        setAdjustAmounts({ ...adjustAmounts, [item.id]: '' })
      }
    } catch (error) {
      console.error('Error updating stock:', error)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleAddNewToInventory = async () => {
    if (!selectedMenuItem) return
    setSavingNewItem(true)
    try {
      const response = await fetch('/api/menu-items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...selectedMenuItem, 
          track_inventory: true, 
          stock_quantity: parseInt(initialStock) || 0 
        })
      })
      
      if (response.ok) {
        await fetchInventory()
        setIsAddDialogOpen(false)
        setSelectedMenuItem(null)
        setInitialStock('0')
      }
    } catch (error) {
      console.error('Error adding new item to inventory:', error)
    } finally {
      setSavingNewItem(false)
    }
  }

  const handleRemoveFromInventory = async () => {
    if (!itemToRemove) return
    setRemovingItem(true)
    try {
      const response = await fetch('/api/menu-items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...itemToRemove, 
          track_inventory: false, 
          stock_quantity: 0 
        })
      })
      
      if (response.ok) {
        await fetchInventory()
        setIsRemoveDialogOpen(false)
        setItemToRemove(null)
      }
    } catch (error) {
      console.error('Error removing item from inventory:', error)
    } finally {
      setRemovingItem(false)
    }
  }

  const categories = ['all', ...new Set(items.map(item => item.category))]

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const searchMenuResults = allMenuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchMenuQuery.toLowerCase())
    const notInInventory = !item.track_inventory
    return matchesSearch && (notInInventory || !item.track_inventory) // Show those not tracked, or all if we want to re-add? better just not tracked.
  })

  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-100">
        <div className="hidden lg:flex h-full w-64 flex-col bg-gray-50 border-r">
          <Sidebar />
        </div>
        
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 lg:mb-6">
                <div>
                  <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900 mb-2">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Link>
                  <h1 className="text-2xl lg:text-3xl font-medium text-gray-900">
                    Inventory Management
                  </h1>
                  <p className="text-gray-600 text-sm lg:text-base">Track and manage your restaurant stock levels</p>
                </div>
                <Button 
                  onClick={() => setIsAddDialogOpen(true)}
                  className="bg-black hover:bg-gray-800 text-white shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add from Menu
                </Button>
              </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Items</div>
                  <div className="text-2xl font-medium mt-1">{items.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-orange-600">
                  <div className="text-sm font-medium opacity-80 uppercase tracking-wider">Low Stock</div>
                  <div className="text-2xl font-medium mt-1">{items.filter(i => i.stock_quantity > 0 && i.stock_quantity <= 5).length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-red-600">
                  <div className="text-sm font-medium opacity-80 uppercase tracking-wider">Out of Stock</div>
                  <div className="text-2xl font-medium mt-1">{items.filter(i => i.stock_quantity <= 0).length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-emerald-600">
                  <div className="text-sm font-medium opacity-80 uppercase tracking-wider">Stock Value</div>
                  <div className="text-2xl font-medium mt-1">₹{items.reduce((s, i) => s + (i.price * (i.stock_quantity || 0)), 0).toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="border-b bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="font-medium">Current Stock Levels</CardTitle>
                    <CardDescription>Adjust and monitor item availability</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input 
                        placeholder="Search items..." 
                        className="pl-9 w-full sm:w-64"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-full sm:w-40 capitalize">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={fetchInventory} disabled={loading}>
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 bg-gray-50/30">
                {loading ? (
                  <div className="text-center py-12 text-gray-500">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-orange-600" />
                    Loading inventory...
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 italic border rounded-lg bg-gray-50/50">
                    No items found matching your criteria
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
                    {filteredItems.map((item) => (
                      <div
                        key={item.id}
                        className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors flex flex-col justify-between"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 leading-tight">{item.name}</h4>
                            <p className="text-sm text-gray-600 mt-0.5">{item.category}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="bg-black text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm whitespace-nowrap">
                              Stock: {item.stock_quantity}
                            </div>
                            <button 
                              onClick={() => {
                                setItemToRemove(item)
                                setIsRemoveDialogOpen(true)
                              }}
                              className="text-gray-400 hover:text-red-600 transition-colors p-1"
                              title="Remove from Inventory"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center px-0.5">
                          <span className="font-normal text-gray-900">₹{item.price.toFixed(2)}</span>
                          
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center border rounded-md h-8 bg-white border-gray-200 overflow-hidden shadow-sm">
                              <button 
                                className="px-2 h-full hover:bg-gray-50 text-gray-500 border-r border-gray-100 transition-colors flex items-center"
                                onClick={() => handleUpdateStock(item, adjustAmounts[item.id], 'sub')}
                                disabled={updatingId === item.id || !adjustAmounts[item.id] || item.stock_quantity <= 0}
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <Input 
                                type="number"
                                className="w-10 h-full border-none bg-transparent text-center font-medium text-[10px] focus-visible:ring-0 px-1 shadow-none"
                                placeholder="0"
                                value={adjustAmounts[item.id] || ''}
                                onChange={(e) => setAdjustAmounts({ ...adjustAmounts, [item.id]: e.target.value })}
                              />
                              <button 
                                className="px-2 h-full hover:bg-gray-50 text-gray-500 border-l border-gray-100 transition-colors flex items-center"
                                onClick={() => handleUpdateStock(item, adjustAmounts[item.id], 'add')}
                                disabled={updatingId === item.id || !adjustAmounts[item.id]}
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <Button 
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-[10px] font-medium uppercase border-gray-200 bg-white hover:bg-black hover:text-white transition-all shadow-sm"
                              onClick={() => handleUpdateStock(item, adjustAmounts[item.id], 'set')}
                              disabled={updatingId === item.id || !adjustAmounts[item.id]}
                            >
                              SET
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {items.some(i => i.stock_quantity <= 5) && (
              <div className="mt-6 flex items-start space-x-3 p-4 bg-orange-50 border border-orange-100 rounded-lg text-orange-800">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Inventory Low Stock Alert</p>
                  <p className="text-sm opacity-90">Attention: Some tracked items have dropped below their safety threshold. Please reorder soon.</p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Add from Menu Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] bg-white rounded-2xl">
          <DialogHeader className="px-8 py-10 bg-neutral-900 text-white border-b border-neutral-800 flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-orange-600/20 border border-orange-600/30 flex items-center justify-center">
                <Plus className="h-5 w-5 text-orange-500" />
              </div>
              <DialogTitle className="text-2xl font-medium tracking-tight">Add to Inventory</DialogTitle>
            </div>
            <DialogDescription className="text-neutral-400 text-sm mt-1 ml-[52px]">
              Find and track menu items for real-time stock management.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-8 flex-1 overflow-y-auto">
            {!selectedMenuItem ? (
              <div className="space-y-6">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400 group-focus-within:text-orange-600 transition-colors" />
                  <Input 
                    placeholder="Search menu items..." 
                    className="pl-12 h-14 bg-gray-50 border-gray-200 text-base focus:bg-white transition-all rounded-xl"
                    value={searchMenuQuery}
                    onChange={(e) => setSearchMenuQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                
                <div className="space-y-2">
                  {searchMenuResults.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 italic border rounded-lg bg-gray-50/50">
                      {searchMenuQuery ? "No matching items found" : "Type to search menu items"}
                    </div>
                  ) : (
                    searchMenuResults.map((item) => (
                      <div 
                        key={item.id}
                        className="flex items-center justify-between p-3 border rounded-xl hover:bg-gray-50 transition-all group"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.category} • ₹{item.price.toFixed(2)}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 rounded-full hover:bg-black hover:text-white"
                          onClick={() => setSelectedMenuItem(item)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6 py-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3 mb-1">
                    <ShoppingBag className="h-5 w-5 text-orange-600" />
                    <h3 className="font-medium text-lg text-gray-900">{selectedMenuItem.name}</h3>
                  </div>
                  <p className="text-sm text-gray-600 ml-8">{selectedMenuItem.category} • Current Price: ₹{selectedMenuItem.price.toFixed(2)}</p>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="initial-stock" className="text-sm font-medium uppercase tracking-wider text-gray-500">
                    Initial Stock Quantity
                  </Label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      id="initial-stock"
                      type="number"
                      placeholder="0"
                      className="pl-10 h-12 text-lg font-medium"
                      value={initialStock}
                      onChange={(e) => setInitialStock(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-gray-500 italic">This quantity will be set as the starting stock for this item.</p>
                </div>
                
                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-11 font-medium" 
                    onClick={() => setSelectedMenuItem(null)}
                  >
                    Back to Search
                  </Button>
                  <Button 
                    className="flex-1 h-11 bg-black hover:bg-gray-800 text-white font-medium"
                    onClick={handleAddNewToInventory}
                    disabled={savingNewItem}
                  >
                    {savingNewItem ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Add to Inventory"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove from Inventory Confirmation Dialog */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] bg-white rounded-2xl">
          <DialogHeader className="px-8 py-10 bg-neutral-900 text-white border-b border-neutral-800 flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-600/20 border border-red-600/30 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <DialogTitle className="text-2xl font-medium tracking-tight">Remove Tracking</DialogTitle>
            </div>
            <DialogDescription className="text-neutral-400 text-sm mt-1 ml-[52px]">
              Stop monitoring stock levels for this item.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-8 space-y-6">
            <p className="text-neutral-600 leading-relaxed text-base">
              Are you sure you want to untrack <span className="font-medium text-neutral-900 underline decoration-red-200 underline-offset-4">"{itemToRemove?.name}"</span>? 
              Its stock will no longer be visible here, though it remains in your menu list.
            </p>
            
            <div className="flex gap-4 pt-4">
              <Button 
                variant="outline" 
                className="flex-1 h-11 font-medium" 
                onClick={() => setIsRemoveDialogOpen(false)}
                disabled={removingItem}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white font-medium shadow-lg"
                onClick={handleRemoveFromInventory}
                disabled={removingItem}
              >
                {removingItem ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Removing...
                  </>
                ) : (
                  "Yes, Remove"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <style jsx global>{`
        [data-slot="dialog-content"] button[aria-label="Close"] {
          color: white !important;
          opacity: 0.8;
          transition: all 0.2s;
        }
        [data-slot="dialog-content"] button[aria-label="Close"]:hover {
          opacity: 1;
          transform: scale(1.1);
        }
      `}</style>
    </AuthGuard>
  )
}
