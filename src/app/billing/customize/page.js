'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AuthGuard } from '@/components/auth-guard'
import { Sidebar } from '@/components/sidebar'
import { Navbar } from '@/components/navbar'
import { ArrowLeft, Save, RotateCcw, Eye } from 'lucide-react'
import Link from 'next/link'

export default function BillCustomize() {
  const [settings, setSettings] = useState({
    // Restaurant Info
    restaurantName: 'Pram Mitra family Restaurant',
    restaurantTagline: 'Delicious Food, Great Service',
    address: 'mandleswar road dhargoan',
    phone: '8085902662',
    email: 'info@restaurant.com',
    
    // Print Settings
    paperSize: '80mm',
    orientation: 'portrait',
    fontSize: 'medium',
    showLogo: true,
    showTax: true,
    showTimestamp: true,
    
    // Layout Settings
    headerAlignment: 'center',
    itemAlignment: 'left',
    footerAlignment: 'center',
    
    // Colors
    primaryColor: '#ea580c',
    textColor: '#111827',
    accentColor: '#f3f4f6',
    
    // Content Settings
    showCustomerInfo: false,
    showWaiterInfo: false,
    showTableNumber: false,
    showPaymentMethod: true,
    showTaxBreakdown: true,
    showGrandTotal: true,
    
    // Advanced
    autoPrint: true,
    printCopies: 1,
    showWatermark: false,
    watermarkText: 'Thank you for visiting!'
  })

  const [previewMode, setPreviewMode] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem('billPrintSettings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [])

  const handleSave = () => {
    localStorage.setItem('billPrintSettings', JSON.stringify(settings))
    alert('Print settings saved successfully!')
  }

  const handleReset = () => {
    const defaultSettings = {
      restaurantName: 'Restaurant POS',
      restaurantTagline: 'Delicious Food, Great Service',
      address: '123 Main Street, City, State 12345',
      phone: '(555) 123-4567',
      email: 'info@restaurant.com',
      paperSize: 'A4',
      orientation: 'portrait',
      fontSize: 'medium',
      showLogo: true,
      showTax: true,
      showTimestamp: true,
      headerAlignment: 'center',
      itemAlignment: 'left',
      footerAlignment: 'center',
      primaryColor: '#ea580c',
      textColor: '#111827',
      accentColor: '#f3f4f6',
      showCustomerInfo: false,
      showWaiterInfo: false,
      showTableNumber: false,
      showPaymentMethod: true,
      showTaxBreakdown: true,
      showGrandTotal: true,
      autoPrint: true,
      printCopies: 1,
      showWatermark: false,
      watermarkText: 'Thank you for visiting!'
    }
    setSettings(defaultSettings)
    localStorage.setItem('billPrintSettings', JSON.stringify(defaultSettings))
  }

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const PreviewBill = () => {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="print-break">
          <CardContent className="p-8" style={{ fontSize: settings.fontSize === 'small' ? '14px' : settings.fontSize === 'large' ? '18px' : '16px' }}>
            {/* Restaurant Header */}
            <div className={`text-center mb-8`} style={{ textAlign: settings.headerAlignment }}>
              {settings.showLogo && (
                <div className="flex justify-center mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: settings.primaryColor }}>
                      <span className="text-white font-bold text-xl">{settings.restaurantName.charAt(0)}</span>
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold" style={{ color: settings.textColor }}>{settings.restaurantName}</h1>
                      <p className="text-gray-600">{settings.restaurantTagline}</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="text-sm text-gray-600">
                <p>{settings.address}</p>
                <p>{settings.phone} | {settings.email}</p>
              </div>
            </div>

            {/* Sample Bill Details */}
            <div className="border-t border-b py-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: settings.textColor }}>BILL</h2>
                  <p className="text-sm text-gray-600">Bill No: #BILL-0001</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Date: {new Date().toLocaleDateString()}</p>
                  <p className="text-sm text-gray-600">Time: {new Date().toLocaleTimeString()}</p>
                </div>
              </div>
            </div>

            {/* Sample Items */}
            <div className="mb-6">
              <div className="space-y-2">
                <div className="flex justify-between" style={{ textAlign: settings.itemAlignment }}>
                  <div>
                    <span className="font-medium">Burger</span>
                    <span className="text-gray-600 ml-2">x2</span>
                  </div>
                  <span style={{ color: settings.textColor }}>₹25.98</span>
                </div>
                <div className="flex justify-between" style={{ textAlign: settings.itemAlignment }}>
                  <div>
                    <span className="font-medium">Pizza</span>
                    <span className="text-gray-600 ml-2">x1</span>
                  </div>
                  <span style={{ color: settings.textColor }}>₹15.99</span>
                </div>
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹41.97</span>
                </div>
                {settings.showTax && (
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>₹3.36</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span style={{ color: settings.primaryColor }}>₹45.33</span>
                </div>
              </div>
            </div>

            {settings.showWatermark && (
              <div className="text-center mt-6 text-gray-400 text-sm">
                {settings.watermarkText}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
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
            {/* Header */}
            <div className="mb-4 lg:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={() => setPreviewMode(!previewMode)} variant="outline" className="flex items-center justify-center">
                    <Eye className="h-4 w-4 mr-2" />
                    {previewMode ? 'Edit Mode' : 'Preview Mode'}
                  </Button>
                  <Button onClick={handleReset} variant="outline" className="flex items-center justify-center">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  <Button onClick={handleSave} className="flex items-center justify-center">
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
              {/* Settings Panel */}
              {!previewMode && (
                <div className="space-y-6">
                  {/* Restaurant Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Restaurant Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="restaurantName">Restaurant Name</Label>
                        <Input
                          id="restaurantName"
                          value={settings.restaurantName}
                          onChange={(e) => updateSetting('restaurantName', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="restaurantTagline">Tagline</Label>
                        <Input
                          id="restaurantTagline"
                          value={settings.restaurantTagline}
                          onChange={(e) => updateSetting('restaurantTagline', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={settings.address}
                          onChange={(e) => updateSetting('address', e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={settings.phone}
                            onChange={(e) => updateSetting('phone', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            value={settings.email}
                            onChange={(e) => updateSetting('email', e.target.value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Print Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Print Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="paperSize">Paper Size</Label>
                          <Select value={settings.paperSize} onValueChange={(value) => updateSetting('paperSize', value)}>
                            <SelectTrigger>
                              <SelectValue />
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
                          <Label htmlFor="orientation">Orientation</Label>
                          <Select value={settings.orientation} onValueChange={(value) => updateSetting('orientation', value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="portrait">Portrait</SelectItem>
                              <SelectItem value="landscape">Landscape</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="fontSize">Font Size</Label>
                          <Select value={settings.fontSize} onValueChange={(value) => updateSetting('fontSize', value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="small">Small</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="large">Large</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="printCopies">Print Copies</Label>
                          <Input
                            id="printCopies"
                            type="number"
                            min="1"
                            max="5"
                            value={settings.printCopies}
                            onChange={(e) => updateSetting('printCopies', parseInt(e.target.value))}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Layout Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Layout Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="headerAlignment">Header Alignment</Label>
                          <Select value={settings.headerAlignment} onValueChange={(value) => updateSetting('headerAlignment', value)}>
                            <SelectTrigger>
                              <SelectValue />
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
                          <Select value={settings.itemAlignment} onValueChange={(value) => updateSetting('itemAlignment', value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">Left</SelectItem>
                              <SelectItem value="center">Center</SelectItem>
                              <SelectItem value="right">Right</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="footerAlignment">Footer Alignment</Label>
                          <Select value={settings.footerAlignment} onValueChange={(value) => updateSetting('footerAlignment', value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">Left</SelectItem>
                              <SelectItem value="center">Center</SelectItem>
                              <SelectItem value="right">Right</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Content Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Content Options</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="showLogo">Show Logo</Label>
                        <input
                          type="checkbox"
                          id="showLogo"
                          checked={settings.showLogo}
                          onChange={(e) => updateSetting('showLogo', e.target.checked)}
                          className="w-4 h-4"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="showTax">Show Tax</Label>
                        <input
                          type="checkbox"
                          id="showTax"
                          checked={settings.showTax}
                          onChange={(e) => updateSetting('showTax', e.target.checked)}
                          className="w-4 h-4"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="showTimestamp">Show Timestamp</Label>
                        <input
                          type="checkbox"
                          id="showTimestamp"
                          checked={settings.showTimestamp}
                          onChange={(e) => updateSetting('showTimestamp', e.target.checked)}
                          className="w-4 h-4"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="showPaymentMethod">Show Payment Method</Label>
                        <input
                          type="checkbox"
                          id="showPaymentMethod"
                          checked={settings.showPaymentMethod}
                          onChange={(e) => updateSetting('showPaymentMethod', e.target.checked)}
                          className="w-4 h-4"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="showWatermark">Show Watermark</Label>
                        <input
                          type="checkbox"
                          id="showWatermark"
                          checked={settings.showWatermark}
                          onChange={(e) => updateSetting('showWatermark', e.target.checked)}
                          className="w-4 h-4"
                        />
                      </div>
                      {settings.showWatermark && (
                        <div>
                          <Label htmlFor="watermarkText">Watermark Text</Label>
                          <Input
                            id="watermarkText"
                            value={settings.watermarkText}
                            onChange={(e) => updateSetting('watermarkText', e.target.value)}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Preview Panel */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>{previewMode ? 'Print Preview' : 'Live Preview'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg p-4 bg-white">
                      <PreviewBill />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
