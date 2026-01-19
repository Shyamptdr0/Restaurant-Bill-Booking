'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AuthGuard } from '@/components/auth-guard'
import { Sidebar } from '@/components/sidebar'
import { Navbar } from '@/components/navbar'
import { Plus, Edit2, Trash2, Users } from 'lucide-react'

export default function TablesPage() {
  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-100">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex h-full w-64 flex-col bg-gray-50 border-r flex-shrink-0">
          <Sidebar />
        </div>

        <div className="flex flex-1 flex-col min-w-0">
          <Navbar />

          <main className="flex-1 overflow-auto bg-gray-50">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
                    <Plus className="h-8 w-8 text-orange-600" />
                  </div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">Coming Soon</h1>
                  <p className="text-lg text-gray-600 mb-8">Table management feature is under development</p>
                  <p className="text-gray-500 max-w-md mx-auto">
                    We're working on an amazing table management system that will help you organize your restaurant seating efficiently.
                  </p>
                </div>
                
                <div className="mt-12">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                    <Card className="text-center">
                      <CardContent className="p-6">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Users className="h-6 w-6 text-blue-600" />
                        </div>
                        <h3 className="font-semibold mb-2">Table Management</h3>
                        <p className="text-sm text-gray-600">Organize and manage your restaurant tables</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="text-center">
                      <CardContent className="p-6">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Edit2 className="h-6 w-6 text-green-600" />
                        </div>
                        <h3 className="font-semibold mb-2">Easy Updates</h3>
                        <p className="text-sm text-gray-600">Quickly update table status and availability</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="text-center">
                      <CardContent className="p-6">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Trash2 className="h-6 w-6 text-orange-600" />
                        </div>
                        <h3 className="font-semibold mb-2">Full Control</h3>
                        <p className="text-sm text-gray-600">Complete control over your restaurant layout</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}


// COMMENTED CODE - PRESERVED FOR FUTURE USE
// This is the original tables implementation that can be restored later

// 'use client'

// import { useState, useEffect } from 'react'
// import { Button } from '@/components/ui/button'
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// import { Input } from '@/components/ui/input'
// import { Label } from '@/components/ui/label'
// import { Badge } from '@/components/ui/badge'
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
// import { AuthGuard } from '@/components/auth-guard'
// import { Sidebar } from '@/components/sidebar'
// import { Navbar } from '@/components/navbar'
// import { Plus, Edit2, Trash2, Users } from 'lucide-react'

// export default function TablesPage() {
//   const [tables, setTables] = useState([])
//   const [isAddModalOpen, setIsAddModalOpen] = useState(false)
//   const [editingTable, setEditingTable] = useState(null)
//   const [selectedSection, setSelectedSection] = useState('')
//   const [formData, setFormData] = useState({
//     name: '',
//     status: 'blank',
//     section: ''
//   })

//   useEffect(() => {
//     fetchTables()
//   }, [])

//   const fetchTables = async () => {
//     try {
//       const response = await fetch('/api/tables')
//       if (response.ok) {
//         const data = await response.json()
//         setTables(data)
//       }
//     } catch (error) {
//       console.error('Error fetching tables:', error)
//     }
//   }

//   const handleSubmit = async (e) => {
//     e.preventDefault()
    
//     if (!formData.section) {
//       alert('Please select a section for the table')
//       return
//     }
    
//     const url = editingTable ? `/api/tables/${editingTable.id}` : '/api/tables'
//     const method = editingTable ? 'PUT' : 'POST'
    
//     try {
//       const response = await fetch(url, {
//         method,
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(formData),
//       })

//       if (response.ok) {
//         fetchTables()
//         setIsAddModalOpen(false)
//         setEditingTable(null)
//         setSelectedSection('')
//         setFormData({ name: '', status: 'blank', section: '' })
//       }
//     } catch (error) {
//       console.error('Error saving table:', error)
//     }
//   }

//   const handleEdit = (table) => {
//     setEditingTable(table)
//     setFormData({
//       name: table.name,
//       status: table.status,
//       section: table.section || ''
//     })
//     setIsAddModalOpen(true)
//   }

//   const handleAddTable = (section) => {
//     setSelectedSection(section)
//     setFormData({ name: '', status: 'blank', section })
//     setEditingTable(null)
//     setIsAddModalOpen(true)
//   }

//   const handleDelete = async (id) => {
//     if (confirm('Are you sure you want to delete this table?')) {
//       try {
//         const response = await fetch(`/api/tables/${id}`, {
//           method: 'DELETE',
//         })

//         if (response.ok) {
//           fetchTables()
//         }
//       } catch (error) {
//         console.error('Error deleting table:', error)
//       }
//     }
//   }

//   const getStatusColor = (status) => {
//     switch (status) {
//       case 'blank':
//         return 'bg-white text-gray-800 border-gray-300 hover:border-gray-400'
//       case 'running':
//         return 'bg-blue-100 text-blue-800 border-blue-300 hover:border-blue-400'
//       case 'printed':
//         return 'bg-green-100 text-green-800 border-green-300 hover:border-green-400'
//       case 'paid':
//         return 'bg-amber-100 text-amber-800 border-amber-300 hover:border-amber-400'
//       case 'running_kot':
//         return 'bg-orange-100 text-orange-800 border-orange-300 hover:border-orange-400'
//       default:
//         return 'bg-white text-gray-800 border-gray-300 hover:border-gray-400'
//     }
//   }


//   return (
//     <AuthGuard>
//       <div className="flex h-screen bg-gray-100">
//          {/* Desktop Sidebar  */}
//         <div className="hidden lg:flex h-full w-64 flex-col bg-gray-50 border-r flex-shrink-0">
//           <Sidebar />
//         </div>

//         <div className="flex flex-1 flex-col min-w-0">
//           <Navbar />

//           <main className="flex-1 overflow-auto bg-white">
//             <div className="p-4">
//               {/* Header */}
//               <div className="flex justify-between items-center mb-6">
//                 <h1 className="text-2xl font-semibold text-gray-800">Tables</h1>
//                 <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
//                   <DialogTrigger asChild>
//                     <Button className="bg-blue-600 hover:bg-blue-700 text-white">
//                       <Plus className="h-4 w-4 mr-2" />
//                       Add Table
//                     </Button>
//                   </DialogTrigger>
//                   <DialogContent className="sm:max-w-[450px] border-0 shadow-xl">
//                     <DialogHeader>
//                       <DialogTitle className="text-xl font-semibold text-gray-800">
//                         {editingTable ? 'Edit Table' : 'Add New Table'}
//                       </DialogTitle>
//                     </DialogHeader>
//                     <form onSubmit={handleSubmit} className="space-y-5">
//                       <div>
//                         <Label htmlFor="section" className="text-sm font-medium text-gray-700">Section</Label>
//                         <Select 
//                           value={formData.section} 
//                           onValueChange={(value) => setFormData({...formData, section: value})}
//                           disabled={!!selectedSection && !editingTable}
//                         >
//                           <SelectTrigger className="border-gray-300 h-11">
//                             <SelectValue placeholder="Select section" />
//                           </SelectTrigger>
//                           <SelectContent>
//                             <SelectItem value="Hole">Hole</SelectItem>
//                             <SelectItem value="Seperate">Seperate</SelectItem>
//                             <SelectItem value="Outside">Outside</SelectItem>
//                           </SelectContent>
//                         </Select>
//                       </div>
//                       <div>
//                         <Label htmlFor="name" className="text-sm font-medium text-gray-700">Table Name</Label>
//                         <Input
//                           id="name"
//                           value={formData.name}
//                           onChange={(e) => setFormData({...formData, name: e.target.value})}
//                           placeholder="e.g., Table 1, S1"
//                           className="border-gray-300 h-11"
//                           required
//                         />
//                       </div>
//                       <div>
//                         <Label htmlFor="status" className="text-sm font-medium text-gray-700">Status</Label>
//                         <Select 
//                           value={formData.status} 
//                           onValueChange={(value) => setFormData({...formData, status: value})}
//                         >
//                           <SelectTrigger className="border-gray-300 h-11">
//                             <SelectValue placeholder="Select status" />
//                           </SelectTrigger>
//                           <SelectContent>
//                             <SelectItem value="blank">Blank</SelectItem>
//                             <SelectItem value="running">Running</SelectItem>
//                             <SelectItem value="printed">Printed</SelectItem>
//                             <SelectItem value="paid">Paid</SelectItem>
//                             <SelectItem value="running_kot">Running KOT</SelectItem>
//                           </SelectContent>
//                         </Select>
//                       </div>
//                       <div className="flex justify-end gap-3 pt-4">
//                         <Button type="button" variant="outline" onClick={() => {
//                           setIsAddModalOpen(false)
//                           setEditingTable(null)
//                           setSelectedSection('')
//                           setFormData({ name: '', status: 'blank', section: '' })
//                         }}>
//                           Cancel
//                         </Button>
//                         <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
//                           {editingTable ? 'Update' : 'Add'} Table
//                         </Button>
//                       </div>
//                     </form>
//                   </DialogContent>
//                 </Dialog>
//               </div>
              
//               {/* Legend */}
//               <div className="flex items-center justify-center mb-6 space-x-4 text-sm text-gray-600">
//                 <div className="flex items-center gap-2">
//                   <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded"></div>
//                   <span>Blank</span>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded"></div>
//                   <span>Running</span>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
//                   <span>Printed</span>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <div className="w-4 h-4 bg-amber-100 border-2 border-amber-300 rounded"></div>
//                   <span>Paid</span>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <div className="w-4 h-4 bg-orange-100 border-2 border-orange-300 rounded"></div>
//                   <span>Running KOT</span>
//                 </div>
//               </div>

//               {/* Table Sections */}
//               <div className="space-y-6">
//                 {tables.length === 0 ? (
//                   <div className="text-center py-12">
//                     <p className="text-gray-500">No tables found. Add your first table to get started.</p>
//                   </div>
//                 ) : (
//                   Object.entries(
//                     tables.reduce((acc, table) => {
//                       const section = table.section || 'Unassigned'
//                       if (!acc[section]) {
//                         acc[section] = []
//                       }
//                       acc[section].push(table)
//                       return acc
//                     }, {})
//                   )).map(([sectionName, sectionTables]) => (
//                     <div key={sectionName} className="bg-gray-50 border border-gray-200 rounded-xl p-5">
//                       <h3 className="text-base font-semibold text-gray-800 mb-4">{sectionName}</h3>
//                       <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 max-w-full mx-auto">
//                         {sectionTables.map((table) => (
//                           <div
//                             key={table.id}
//                             className={`relative h-24 w-32 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 flex items-center justify-center ${getStatusColor(
//                               table.status
//                             )}`}
//                           >
//                             <div className="text-center">
//                               <div className="text-sm font-semibold">{table.name}</div>
//                             </div>
                          
//                             {/* Status Indicators */}
//                             {table.status === 'running' && (
//                               <div className="absolute top-2 right-2">
//                                 <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm"></div>
//                               </div>
//                             )}
                            
//                             {table.status === 'printed' && (
//                               <div className="absolute top-2 right-2">
//                                 <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
//                               </div>
//                             )}
                            
//                             {table.status === 'paid' && (
//                               <div className="absolute top-2 right-2">
//                                 <div className="w-3 h-3 bg-amber-500 rounded-full border-2 border-white shadow-sm"></div>
//                               </div>
//                             )}
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </main>
//         </div>
//       </div>
//     </AuthGuard>
//   )
// }

// END OF COMMENTED CODE

