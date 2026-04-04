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
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

export default function InventoryPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [updatingId, setUpdatingId] = useState(null)
  const [adjustAmounts, setAdjustAmounts] = useState({})

  useEffect(() => {
    fetchInventory()
  }, [])

  const fetchInventory = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/menu-items')
      const result = await response.json()
      const inventoryItems = (result.data || []).filter(item => item.track_inventory)
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

  const categories = ['all', ...new Set(items.map(item => item.category))]

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    return matchesSearch && matchesCategory
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
            <div className="mb-4 lg:mb-6">
              <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900 mb-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                Inventory Management
              </h1>
              <p className="text-gray-600 text-sm lg:text-base">Track and manage your restaurant stock levels</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Items</div>
                  <div className="text-2xl font-bold mt-1">{items.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-orange-600">
                  <div className="text-sm font-medium opacity-80 uppercase tracking-wider">Low Stock</div>
                  <div className="text-2xl font-bold mt-1">{items.filter(i => i.stock_quantity > 0 && i.stock_quantity <= 5).length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-red-600">
                  <div className="text-sm font-medium opacity-80 uppercase tracking-wider">Out of Stock</div>
                  <div className="text-2xl font-bold mt-1">{items.filter(i => i.stock_quantity <= 0).length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-emerald-600">
                  <div className="text-sm font-medium opacity-80 uppercase tracking-wider">Stock Value</div>
                  <div className="text-2xl font-bold mt-1">₹{items.reduce((s, i) => s + (i.price * (i.stock_quantity || 0)), 0).toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="border-b bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Current Stock Levels</CardTitle>
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
                          <div className="bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm whitespace-nowrap">
                            Stock: {item.stock_quantity}
                          </div>
                        </div>

                        <div className="flex justify-between items-center px-0.5">
                          <span className="font-semibold text-gray-900">₹{item.price.toFixed(2)}</span>
                          
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
                                className="w-10 h-full border-none bg-transparent text-center font-bold text-[10px] focus-visible:ring-0 px-1 shadow-none"
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
                              className="h-8 px-2 text-[10px] font-bold uppercase border-gray-200 bg-white hover:bg-black hover:text-white transition-all shadow-sm"
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
                  <p className="font-bold">Inventory Low Stock Alert</p>
                  <p className="text-sm opacity-90">Attention: Some tracked items have dropped below their safety threshold. Please reorder soon.</p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
