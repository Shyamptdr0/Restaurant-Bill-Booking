'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AuthGuard } from '@/components/auth-guard'
import { Sidebar } from '@/components/sidebar'
import { Navbar } from '@/components/navbar'
import { Plus, Edit2, Trash2, Users, Utensils, Receipt, CreditCard, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function TablesPage() {
  const router = useRouter()
  const [tables, setTables] = useState([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isActionModalOpen, setIsActionModalOpen] = useState(false)
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const [editingTable, setEditingTable] = useState(null)
  const [selectedTable, setSelectedTable] = useState(null)
  const [selectedSection, setSelectedSection] = useState('')
  const [connectionError, setConnectionError] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    status: 'blank',
    section: ''
  })

  useEffect(() => {
    fetchTables()
    
    // Auto-refresh tables every 3 seconds for multi-device sync
    const intervalId = setInterval(() => {
      fetchTables()
    }, 3000)
    
    return () => clearInterval(intervalId)
  }, [])

  const fetchTables = async () => {
    try {
      setConnectionError(false)
      const response = await fetch('/api/tables')
      if (response.ok) {
        const data = await response.json()
        // Handle both direct array and error response with tables array
        if (Array.isArray(data)) {
          setTables(data)
        } else if (data.tables && Array.isArray(data.tables)) {
          setTables(data.tables)
          if (data.error) {
            console.warn('Database warning:', data.error)
            setConnectionError(true)
          }
        } else {
          setTables([])
          setConnectionError(true)
        }
      } else {
        console.error('Failed to fetch tables')
        setTables([])
        setConnectionError(true)
      }
    } catch (error) {
      console.error('Error fetching tables:', error)
      setTables([])
      setConnectionError(true)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.section) {
      alert('Please select a section for the table')
      return
    }

    const url = editingTable ? `/api/tables/${editingTable.id}` : '/api/tables'
    const method = editingTable ? 'PUT' : 'POST'

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchTables()
        setIsAddModalOpen(false)
        setEditingTable(null)
        setSelectedSection('')
        setFormData({ name: '', status: 'blank', section: '' })
      }
    } catch (error) {
      console.error('Error saving table:', error)
    }
  }

  const handleTableClick = (table) => {
    if (table.status === 'blank') {
      // Direct navigation to create bill for blank tables
      router.push(`/billing/create?tableId=${table.id}&tableName=${table.name}&section=${table.section}`)
    } else {
      // Show action modal for non-blank tables
      setSelectedTable(table)
      setIsActionModalOpen(true)
    }
  }

  const handleAddItems = (table) => {
    // Navigate to create bill page with table info
    router.push(`/billing/create?tableId=${table.id}&tableName=${table.name}&section=${table.section}`)
    setIsActionModalOpen(false)
  }

  const handlePrintBill = async () => {
    if (!selectedTable) return

    try {
      // Instantly navigate to the print page. The print page will fetch its own data
      // and handle empty states gracefully. This removes a redundant API call that was slowing down the UI.
      router.push(`/billing/print-temporary/${selectedTable.id}?tableName=${encodeURIComponent(selectedTable.name)}&section=${encodeURIComponent(selectedTable.section)}`)
      setIsActionModalOpen(false)
    } catch (error) {
      console.error('Error navigating to print page:', error)
    }
  }

  const handleResetTable = () => {
    setIsResetConfirmOpen(true)
  }

  const confirmResetTable = async () => {
    if (selectedTable) {
      try {
        await fetch(`/api/tables/${selectedTable.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: selectedTable.name,
            section: selectedTable.section,
            status: 'blank'
          })
        })

        // Also clear any temporary items associated with this table
        await fetch(`/api/temporary-items?table_id=${selectedTable.id}`, {
          method: 'DELETE'
        })

        fetchTables()
        setIsActionModalOpen(false)
        setIsResetConfirmOpen(false)
      } catch (error) {
        console.error('Error resetting table:', error)
      }
    }
  }

  const handleSettleBill = async () => {
    if (selectedTable) {
      // Find the printed bill for this table
      try {
        const response = await fetch(`/api/bills?table_id=${selectedTable.id}&status=printed`)
        if (response.ok) {
          const bills = await response.json()
          if (bills.data && bills.data.length > 0) {
            // Sort by most recent to get the correct bill
            const sortedBills = bills.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            const bill = sortedBills[0]
            
            // Update bill status to paid
            await fetch(`/api/bills/${bill.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'paid' })
            })

            // Clear temporary items from database (just in case)
            await fetch(`/api/temporary-items?table_id=${selectedTable.id}`, {
              method: 'DELETE'
            })

            // Update table status to paid
            await fetch(`/api/tables/${selectedTable.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: selectedTable.name,
                section: selectedTable.section,
                status: 'paid'
              })
            })

            fetchTables()
            setIsActionModalOpen(false)
          }
        }
      } catch (error) {
        console.error('Error settling bill:', error)
      }
    }
  }

  const handleEdit = (table) => {
    setEditingTable(table)
    setFormData({
      name: table.name,
      status: table.status,
      section: table.section || ''
    })
    setIsAddModalOpen(true)
  }

  const handleAddTable = (section) => {
    setSelectedSection(section)
    setFormData({ name: '', status: 'blank', section })
    setEditingTable(null)
    setIsAddModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this table?')) {
      try {
        const response = await fetch(`/api/tables/${id}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          fetchTables()
        }
      } catch (error) {
        console.error('Error deleting table:', error)
      }
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'blank':
        return 'bg-white text-gray-800 border-gray-300 hover:border-gray-400'
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-300 hover:border-blue-400'
      case 'printed':
        return 'bg-green-100 text-green-800 border-green-300 hover:border-green-400'
      case 'paid':
        return 'bg-amber-100 text-amber-800 border-amber-300 hover:border-amber-400'
      case 'running_kot':
        return 'bg-orange-100 text-orange-800 border-orange-300 hover:border-orange-400'
      default:
        return 'bg-white text-gray-800 border-gray-300 hover:border-gray-400'
    }
  }


  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-100">
        {/* Desktop Sidebar  */}
        <div className="hidden lg:flex h-full w-64 flex-col bg-gray-50 border-r flex-shrink-0">
          <Sidebar />
        </div>

        <div className="flex flex-1 flex-col min-w-0">
          <Navbar />

          <main className="flex-1 overflow-auto bg-white">
            <div className="p-4">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold text-gray-800">Tables</h1>
                  {connectionError && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-100 border border-red-300 rounded-full">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-red-700">Connection Error</span>
                    </div>
                  )}
                </div>
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Table
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[450px] border-0 shadow-xl">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-semibold text-gray-800">
                        {editingTable ? 'Edit Table' : 'Add New Table'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div>
                        <Label htmlFor="section" className="text-sm font-medium text-gray-700">Section</Label>
                        <Select
                          value={formData.section}
                          onValueChange={(value) => setFormData({ ...formData, section: value })}
                        >
                          <SelectTrigger className="border-gray-300 h-11">
                            <SelectValue placeholder="Select section" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Hall">Hall</SelectItem>
                            <SelectItem value="Seperate">Seperate</SelectItem>
                            <SelectItem value="Outside">Outside</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="name" className="text-sm font-medium text-gray-700">Table Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g., Table 1, S1"
                          className="border-gray-300 h-11"
                          required
                        />
                      </div>
                      <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => {
                          setIsAddModalOpen(false)
                          setEditingTable(null)
                          setSelectedSection('')
                          setFormData({ name: '', status: 'blank', section: '' })
                        }}>
                          Cancel
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                          {editingTable ? 'Update' : 'Add'} Table
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center mb-6 space-x-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded"></div>
                  <span>Blank</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded"></div>
                  <span>Running</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
                  <span>Printed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-amber-100 border-2 border-amber-300 rounded"></div>
                  <span>Paid</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-100 border-2 border-orange-300 rounded"></div>
                  <span>Running KOT</span>
                </div>
              </div>

              {/* Table Sections */}
              <div className="space-y-6">
                {tables.length === 0 ? (
                  <div className="text-center py-12">
                    {connectionError ? (
                      <>
                        <div className="mb-4">
                          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <div className="w-8 h-8 bg-red-500 rounded-full"></div>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">Connection Error</h3>
                          <p className="text-gray-600 mb-4">Unable to connect to the database. Please check your internet connection.</p>
                          <Button onClick={fetchTables} className="bg-blue-600 hover:bg-blue-700 text-white">
                            Retry Connection
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-gray-500">No tables found. Add your first table to get started.</p>
                      </>
                    )}
                  </div>
                ) : (
                  // Define fixed section order
                  ['Hall', 'Seperate', 'Outside'].map((sectionName) => {
                    const sectionTables = tables
                      .filter(table => (table.section || 'Unassigned') === sectionName)
                      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) // Sort by creation date

                    if (sectionTables.length === 0) return null

                    return (
                      <div key={sectionName} className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                        <h3 className="text-base font-semibold text-gray-800 mb-4">{sectionName}</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 max-w-full mx-auto">
                          {sectionTables.map((table) => (
                            <div
                              key={table.id}
                              className={`relative h-24 w-32 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 flex items-center justify-center ${getStatusColor(
                                table.status
                              )}`}
                              onClick={() => handleTableClick(table)}
                            >
                              <div className="text-center">
                                <div className="text-sm font-semibold">{table.name}</div>
                              </div>

                              {/* Status Indicators */}
                              {table.status === 'running' && (
                                <div className="absolute top-2 right-2">
                                  <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm"></div>
                                </div>
                              )}

                              {table.status === 'printed' && (
                                <div className="absolute top-2 right-2">
                                  <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                                </div>
                              )}

                              {table.status === 'paid' && (
                                <div className="absolute top-2 right-2">
                                  <div className="w-3 h-3 bg-amber-500 rounded-full border-2 border-white shadow-sm"></div>
                                </div>
                              )}

                              {table.status === 'running_kot' && (
                                <div className="absolute top-2 right-2">
                                  <div className="w-3 h-3 bg-orange-500 rounded-full border-2 border-white shadow-sm"></div>
                                </div>
                              )}

                              {/* Delete Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDelete(table.id)
                                }}
                                className="absolute bottom-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })
                )}

              </div>
            </div>
          </main>
        </div>

        {/* Table Action Dialog */}
        <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
          <DialogContent className="sm:max-w-[500px] border border-gray-100 shadow-2xl rounded-2xl p-0 overflow-hidden">
            <div className="p-6 pb-4 bg-white border-b border-gray-100">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  {selectedTable?.name}
                  <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md tracking-wide">
                    {selectedTable?.section?.toUpperCase()}
                  </span>
                </DialogTitle>
              </DialogHeader>
            </div>
            
            <div className="p-6 bg-slate-50/50">
              <div className="grid grid-cols-2 gap-4">
                {selectedTable?.status === 'blank' && (
                  <button 
                    onClick={() => handleAddItems(selectedTable)}
                    className="col-span-2 flex flex-col items-center justify-center h-32 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 shadow-sm hover:shadow-lg active:scale-[0.98] cursor-pointer hover:-translate-y-1"
                  >
                    <Utensils className="h-8 w-8 mb-3" />
                    <span className="font-semibold text-lg tracking-wide">Add Items</span>
                  </button>
                )}
                
                {(selectedTable?.status === 'running' || selectedTable?.status === 'running_kot') && (
                  <>
                    <button 
                      onClick={() => handleAddItems(selectedTable)}
                      className="flex flex-col items-center justify-center h-32 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 shadow-sm hover:shadow-lg active:scale-[0.98] cursor-pointer hover:-translate-y-1"
                    >
                      <Utensils className="h-8 w-8 mb-3" />
                      <span className="font-semibold tracking-wide">Add More Items</span>
                    </button>
                    <button 
                      onClick={handlePrintBill}
                      className="flex flex-col items-center justify-center h-32 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-200 shadow-sm hover:shadow-lg active:scale-[0.98] cursor-pointer hover:-translate-y-1"
                    >
                      <Receipt className="h-8 w-8 mb-3" />
                      <span className="font-semibold tracking-wide">Print Bill</span>
                    </button>
                  </>
                )}
                
                {selectedTable?.status === 'paid' && (
                  <button 
                    onClick={handleResetTable}
                    className="col-span-2 flex flex-col items-center justify-center h-32 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all duration-200 shadow-sm hover:shadow-lg active:scale-[0.98] cursor-pointer hover:-translate-y-1"
                  >
                    <Plus className="h-8 w-8 mb-3 text-slate-400" />
                    <span className="font-semibold tracking-wide text-lg">Reset Table to Blank</span>
                  </button>
                )}
                
                {selectedTable?.status === 'printed' && (
                  <button 
                    onClick={handleSettleBill}
                    className="col-span-2 flex flex-col items-center justify-center h-32 rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-all duration-200 shadow-sm hover:shadow-lg active:scale-[0.98] cursor-pointer hover:-translate-y-1"
                  >
                    <CreditCard className="h-8 w-8 mb-3" />
                    <span className="font-semibold tracking-wide text-lg">Settle Payment</span>
                  </button>
                )}
              </div>
              
              <div className="mt-6">
                <Button 
                  variant="outline"
                  onClick={() => setIsActionModalOpen(false)}
                  className=" cursor-pointer w-full h-12 text-base font-medium rounded-xl border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reset Confirmation Dialog */}
        <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
          <DialogContent className="sm:max-w-[400px] border-0 shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Reset Table Confirmation
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-amber-800 font-medium mb-2">Are you sure you want to reset this table?</p>
                <div className="text-sm text-amber-700 space-y-1">
                  <p>• Table: <span className="font-semibold">{selectedTable?.name}</span></p>
                  <p>• Section: <span className="font-semibold">{selectedTable?.section}</span></p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  This action will reset the table status to <span className="font-semibold">"Blank"</span> and make it available for new customers.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmResetTable}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Reset Table
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  )
}

// END OF COMMENTED CODE

