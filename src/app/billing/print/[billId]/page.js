'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AuthGuard } from '@/components/auth-guard'
import { Sidebar } from '@/components/sidebar'
import { Navbar } from '@/components/navbar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Printer, Home, Settings, Save } from 'lucide-react'
import Link from 'next/link'

export default function PrintBill() {
  const [bill, setBill] = useState(null)
  const [billItems, setBillItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [printSettings, setPrintSettings] = useState({})
  const [showCustomize, setShowCustomize] = useState(false)
  const [tempSettings, setTempSettings] = useState({})
  const params = useParams()
  const router = useRouter()
  const billId = params.billId

  useEffect(() => {
    fetchBillDetails()
    loadPrintSettings()
  }, [billId])

  useEffect(() => {
    if (bill && !loading && printSettings.autoPrint) {
      // Auto print after component mounts
      setTimeout(() => {
        window.print()
      }, 500)
    }
  }, [bill, loading, printSettings])

  const loadPrintSettings = () => {
    const savedSettings = localStorage.getItem('billPrintSettings')
    if (savedSettings) {
      setPrintSettings(JSON.parse(savedSettings))
    } else {
      // Default settings
      setPrintSettings({
        restaurantName: 'Param Mitra Family Restaurant',
        restaurantTagline: 'Delicious Food, Great Service',
        address: 'Mandleswar road Dhargoan',
        phone: '8085902662',
        fontSize: 'medium',
        paperSize: '80mm', // Thermal receipt size - most common for restaurants
        showLogo: true,
        showTax: true,
        showTimestamp: true,
        headerAlignment: 'center',
        itemAlignment: 'left',
        primaryColor: '#ea580c',
        textColor: '#111827',
        showPaymentMethod: true,
        showWatermark: false,
        watermarkText: 'Thank you for visiting!',
        autoPrint: false
      })
    }
  }

  // Calculate service tax for an item (5% of item total)
  const calculateServiceTaxPerItem = (item) => {
    const serviceTaxRate = 0.05; // 5% service tax
    return (item.price * item.quantity) * serviceTaxRate;
  };

  const fetchBillDetails = async () => {
    try {
      const response = await fetch(`/api/bills/${billId}`)
      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      setBill(result.data)
      setBillItems(result.data.items || [])
    } catch (error) {
      console.error('Error fetching bill details:', error)
      alert('Error loading bill: ' + error.message)
      router.push('/billing/create')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleNewBill = () => {
    router.push('/billing/create')
  }

  const handleCustomize = () => {
    setTempSettings({ ...printSettings })
    setShowCustomize(true)
  }

  const handleSaveSettings = () => {
    setPrintSettings(tempSettings)
    localStorage.setItem('billPrintSettings', JSON.stringify(tempSettings))
    setShowCustomize(false)
  }

  const handleCancelCustomize = () => {
    setTempSettings({})
    setShowCustomize(false)
  }

  const updateTempSetting = (key, value) => {
    setTempSettings(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
              <img src="/PM-logo.png" alt="ParamMitra Restaurant" className="h-16 w-auto animate-pulse" />
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (!bill) {
    return (
      <AuthGuard>
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500">Bill not found</p>
              <Link href="/billing/create">
                <Button className="mt-4">Create New Bill</Button>
              </Link>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  const getFontSizeClass = () => {
    switch (printSettings.fontSize) {
      case 'small': return 'text-sm'
      case 'large': return 'text-lg'
      default: return 'text-base'
    }
  }

  const getAlignmentClass = (alignment) => {
    switch (alignment) {
      case 'left': return 'text-left'
      case 'right': return 'text-right'
      default: return 'text-center'
    }
  }

  const getPaperSizeClass = () => {
    switch (printSettings.paperSize) {
      case '57mm': return 'max-w-[200px]' // 57mm thermal receipt
      case '80mm': return 'max-w-[300px]' // 80mm thermal receipt (default)
      case 'A4': return 'max-w-4xl' // A4 paper
      case 'Letter': return 'max-w-4xl' // Letter paper
      default: return 'max-w-[300px]' // Default to 80mm
    }
  }

  const getPaperSizePadding = () => {
    switch (printSettings.paperSize) {
      case '57mm': return 'p-4' // Compact padding for 57mm
      case '80mm': return 'p-6' // Standard padding for 80mm
      case 'A4': return 'p-8' // Full padding for A4
      case 'Letter': return 'p-8' // Full padding for Letter
      default: return 'p-6' // Default to 80mm
    }
  }

  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <main className="flex-1 p-6 overflow-auto">
            {/* Control Buttons - Hidden when printing */}
            <div className="no-print mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={handleCustomize} variant="outline" className="flex items-center justify-center">
                    <Settings className="h-4 w-4 mr-2" />
                    Customize
                  </Button>
                  <Button onClick={handlePrint} className="flex items-center justify-center">
                    <Printer className="h-4 w-4 mr-2" />
                    Print Bill
                  </Button>
                  <Button onClick={handleNewBill} variant="outline" className="flex items-center justify-center">
                    <Home className="h-4 w-4 mr-2" />
                    New Bill
                  </Button>
                </div>
              </div>
            </div>

            {/* Customize Panel - Hidden when printing */}
            {showCustomize && (
              <div className="no-print mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Customize Print Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Restaurant Information */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Restaurant Information</h3>
                        <div>
                          <Label htmlFor="restaurantName">Restaurant Name</Label>
                          <Input
                            id="restaurantName"
                            value={tempSettings.restaurantName || ''}
                            onChange={(e) => updateTempSetting('restaurantName', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="address">Address</Label>
                          <Input
                            id="address"
                            value={tempSettings.address || ''}
                            onChange={(e) => updateTempSetting('address', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={tempSettings.phone || ''}
                            onChange={(e) => updateTempSetting('phone', e.target.value)}
                          />
                        </div>
              
                      </div>

                      {/* Print Settings */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Print Settings</h3>
                        <div>
                          <Label htmlFor="paperSize">Paper Size</Label>
                          <Select value={tempSettings.paperSize || '80mm'} onValueChange={(value) => updateTempSetting('paperSize', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select paper size" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="57mm">57mm - Thermal Receipt</SelectItem>
                              <SelectItem value="80mm">80mm - Thermal Receipt</SelectItem>
                              <SelectItem value="A4">A4 - Professional Invoice</SelectItem>
                              <SelectItem value="Letter">Letter - Professional Invoice</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="fontSize">Font Size</Label>
                          <Select value={tempSettings.fontSize || 'medium'} onValueChange={(value) => updateTempSetting('fontSize', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select font size" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="small">Small</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="large">Large</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="headerAlignment">Header Alignment</Label>
                          <Select value={tempSettings.headerAlignment || 'center'} onValueChange={(value) => updateTempSetting('headerAlignment', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select alignment" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">Left</SelectItem>
                              <SelectItem value="center">Center</SelectItem>
                              <SelectItem value="right">Right</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="itemAlignment">Item Alignment</Label>
                          <Select value={tempSettings.itemAlignment || 'left'} onValueChange={(value) => updateTempSetting('itemAlignment', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select alignment" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">Left</SelectItem>
                              <SelectItem value="center">Center</SelectItem>
                              <SelectItem value="right">Right</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Display Options */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Display Options</h3>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="showLogo"
                              checked={tempSettings.showLogo || false}
                              onChange={(e) => updateTempSetting('showLogo', e.target.checked)}
                            />
                            <Label htmlFor="showLogo">Show Logo</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="showTax"
                              checked={tempSettings.showTax || false}
                              onChange={(e) => updateTempSetting('showTax', e.target.checked)}
                            />
                            <Label htmlFor="showTax">Show Tax</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="showTimestamp"
                              checked={tempSettings.showTimestamp || false}
                              onChange={(e) => updateTempSetting('showTimestamp', e.target.checked)}
                            />
                            <Label htmlFor="showTimestamp">Show Timestamp</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="showPaymentMethod"
                              checked={tempSettings.showPaymentMethod || false}
                              onChange={(e) => updateTempSetting('showPaymentMethod', e.target.checked)}
                            />
                            <Label htmlFor="showPaymentMethod">Show Payment Method</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="showWatermark"
                              checked={tempSettings.showWatermark || false}
                              onChange={(e) => updateTempSetting('showWatermark', e.target.checked)}
                            />
                            <Label htmlFor="showWatermark">Show Watermark</Label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-6 pt-6 border-t">
                      <Button onClick={handleSaveSettings} className="flex items-center">
                        <Save className="h-4 w-4 mr-2" />
                        Save Settings
                      </Button>
                      <Button onClick={handleCancelCustomize} variant="outline">
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Printable Bill Content */}
            <div className={`${getPaperSizeClass()} mx-auto max-w-full px-2 sm:px-0`}>
              <Card className="print-break">
                <CardContent className={`${getPaperSizePadding()} ${getFontSizeClass()}`} style={{ color: printSettings.textColor }}>
                  {/* Restaurant Header */}
                  <div className={`mb-8 ${getAlignmentClass(printSettings.headerAlignment)}`}>
                    {printSettings.showLogo && (
                      <div className="flex justify-center mb-4">
                        <div className="flex items-center space-x-2">
                          <div>
                            <h1 className="text-2xl font-bold">{printSettings.restaurantName}</h1>
                            <p className="text-gray-600">{printSettings.restaurantTagline || 'Delicious Food, Great Service'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="text-sm text-gray-600">
                      <p>{printSettings.address}</p>
                      <p>{printSettings.phone || '8085902662'} </p>
                    </div>
                  </div>

                  {/* Bill Details */}
                  <div className="border-t border-b py-4 mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h2 className="text-xl font-bold">BILL</h2>
                        <p className="text-sm text-gray-600">Bill No: #{bill.bill_no}</p>
                      </div>
                      {printSettings.showTimestamp && (
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Date: {new Date(bill.created_at).toLocaleDateString()}</p>
                          <p className="text-sm text-gray-600">Time: {new Date(bill.created_at).toLocaleTimeString()}</p>
                        </div>
                      )}
                    </div>
                    {printSettings.showPaymentMethod && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">Payment: {bill.payment_type?.toUpperCase()}</p>
                      </div>
                    )}
                  </div>

                  {/* Bill Items */}
                  <div className="mb-6">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left pb-2">Item</th>
                          <th className="text-right px-1 pb-2">Qty</th>
                          <th className="text-right px-1 pb-2">Rate</th>
                          <th className="text-right px-1 pb-2">Total Amt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billItems.map((item, index) => {
                          const itemTotal = (item.price * item.quantity) + (item.sgst_amount || 0) + (item.cgst_amount || 0);
                          
                          return (
                            <tr key={index} className="border-b border-gray-100">
                              <td className="py-1">{item.menu_items?.name || `Item ${index + 1}`}</td>
                              <td className="text-right px-1">{item.quantity}</td>
                              <td className="text-right px-1">₹{item.price.toFixed(2)}</td>
                              <td className="text-right px-1">₹{itemTotal.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals */}
                  <div className="border-t pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between border-b pb-1 mb-1">
                        <span>Total Items:</span>
                        <span>{billItems.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>₹{parseFloat(bill.subtotal).toFixed(2)}</span>
                      </div>
                      {printSettings.showTax && (
                        <>
                          {bill.total_sgst > 0 && (
                            <div className="flex justify-between">
                              <span>SGST ({(bill.total_sgst / bill.subtotal * 100).toFixed(2)}%):</span>
                              <span>₹{parseFloat(bill.total_sgst).toFixed(2)}</span>
                            </div>
                          )}
                          {bill.total_cgst > 0 && (
                            <div className="flex justify-between">
                              <span>CGST ({(bill.total_cgst / bill.subtotal * 100).toFixed(2)}%):</span>
                              <span>₹{parseFloat(bill.total_cgst).toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-medium">
                            <span>Total Selling Tax:</span>
                            <span>₹{((bill.total_sgst || 0) + (bill.total_cgst || 0)).toFixed(2)}</span>
                          </div>
                          {bill.service_tax_amount > 0 && (
                            <div className="flex justify-between">
                              <span>Service Charge (5%):</span>
                              <span>₹{parseFloat(bill.service_tax_amount).toFixed(2)}</span>
                            </div>
                          )}
                        </>
                      )}
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total:</span>
                          <span style={{ color: printSettings.primaryColor }}>
                            ₹{parseFloat(bill.total_amount).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {printSettings.showWatermark && (
                    <div className="text-center mt-6 text-gray-400 text-sm">
                      {printSettings.watermarkText}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
