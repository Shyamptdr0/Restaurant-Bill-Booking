'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AuthGuard } from '@/components/auth-guard'
import { Sidebar } from '@/components/sidebar'
import { Navbar } from '@/components/navbar'
import { ArrowLeft, Printer, Home } from 'lucide-react'
import Link from 'next/link'

export default function PrintBill() {
  const [bill, setBill] = useState(null)
  const [billItems, setBillItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [printSettings, setPrintSettings] = useState({})
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
        restaurantName: 'Restaurant POS',
        restaurantTagline: 'Delicious Food, Great Service',
        address: '123 Main Street, City, State 12345',
        phone: '(555) 123-4567',
        email: 'info@restaurant.com',
        fontSize: 'medium',
        showLogo: true,
        showTax: true,
        showTimestamp: true,
        headerAlignment: 'center',
        itemAlignment: 'left',
        primaryColor: '#ea580c',
        textColor: '#111827',
        showPaymentMethod: true,
        showWatermark: false,
        watermarkText: 'Thank you for visiting!'
      })
    }
  }

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

  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <main className="flex-1 p-6 overflow-auto">
            {/* Control Buttons - Hidden when printing */}
            <div className="no-print mb-6">
              <div className="flex items-center justify-between">
                <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
                <div className="flex space-x-2">
                  <Button onClick={handlePrint} className="flex items-center">
                    <Printer className="h-4 w-4 mr-2" />
                    Print Bill
                  </Button>
                  <Button onClick={handleNewBill} variant="outline" className="flex items-center">
                    <Home className="h-4 w-4 mr-2" />
                    New Bill
                  </Button>
                </div>
              </div>
            </div>

            {/* Printable Bill Content */}
            <div className="max-w-2xl mx-auto">
              <Card className="print-break">
                <CardContent className={`p-8 ₹{getFontSizeClass()}`} style={{ color: printSettings.textColor }}>
                  {/* Restaurant Header */}
                  <div className={`mb-8 ₹{getAlignmentClass(printSettings.headerAlignment)}`}>
                    {printSettings.showLogo && (
                      <div className="flex justify-center mb-4">
                        <div className="flex items-center space-x-2">
                          <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: printSettings.primaryColor }}>
                            <span className="text-white font-bold text-xl">{printSettings.restaurantName?.charAt(0) || 'R'}</span>
                          </div>
                          <div>
                            <h1 className="text-2xl font-bold">{printSettings.restaurantName || 'Restaurant POS'}</h1>
                            <p className="text-gray-600">{printSettings.restaurantTagline || 'Delicious Food, Great Service'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="text-sm text-gray-600">
                      <p>{printSettings.address || '123 Main Street, City, State 12345'}</p>
                      <p>{printSettings.phone || '(555) 123-4567'} | {printSettings.email || 'info@restaurant.com'}</p>
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
                    <div className="space-y-2">
                      {billItems.map((item, index) => (
                        <div key={index} className={`flex justify-between ₹{getAlignmentClass(printSettings.itemAlignment)}`}>
                          <div>
                            <span className="font-medium">{item.menu_items?.name || `Item ₹{index + 1}`}</span>
                            <span className="text-gray-600 ml-2">x{item.quantity}</span>
                          </div>
                          <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="border-t pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>₹{parseFloat(bill.subtotal).toFixed(2)}</span>
                      </div>
                      {printSettings.showTax && (
                        <div className="flex justify-between">
                          <span>Tax:</span>
                          <span>₹{parseFloat(bill.tax_amount).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span style={{ color: printSettings.primaryColor }}>
                          ₹{parseFloat(bill.total_amount).toFixed(2)}
                        </span>
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
