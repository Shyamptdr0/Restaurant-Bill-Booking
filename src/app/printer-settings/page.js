'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AuthGuard } from '@/components/auth-guard'
import { Sidebar } from '@/components/sidebar'
import { Navbar } from '@/components/navbar'
import {
  Printer,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Save,
  FileText,
  Sliders,
  Scissors,
  Store,
  Server,
  Zap
} from 'lucide-react'
import {
  DEFAULT_PRINTER_SETTINGS,
  getStoredPrinterSettings,
  saveStoredPrinterSettings,
  getSystemPrinters,
  checkPrinterServiceStatus
} from '@/lib/thermal-printer'

export default function PrinterSettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_PRINTER_SETTINGS)
  const [printersList, setPrintersList] = useState([])
  const [loadingPrinters, setLoadingPrinters] = useState(false)
  const [serverStatus, setServerStatus] = useState({ online: false, message: 'Checking printer server...' })
  const [testingConnection, setTestingConnection] = useState(false)
  const [testingPrint, setTestingPrint] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    // Load stored settings on mount
    const stored = getStoredPrinterSettings()
    setSettings(stored)
    verifyServerAndPrinters(stored.serverUrl)
  }, [])

  const verifyServerAndPrinters = async (serverUrl) => {
    setLoadingPrinters(true)
    const status = await checkPrinterServiceStatus(serverUrl)
    setServerStatus(status)

    const result = await getSystemPrinters(serverUrl)
    if (result.success && result.printers) {
      setPrintersList(result.printers)
    } else {
      setPrintersList([])
    }
    setLoadingPrinters(false)
  }

  const handleScanPrinters = () => {
    setStatusMessage({ type: 'info', text: 'Scanning for connected system printers...' })
    verifyServerAndPrinters(settings.serverUrl)
  }

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaveSuccess(false)
  }

  const handleSave = () => {
    saveStoredPrinterSettings(settings)
    
    // Optional sync to local server if active
    if (settings.useLocalServer) {
      fetch(`${settings.serverUrl}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerName: settings.printerName,
          printerType: settings.printerType,
          paperWidth: settings.paperWidth,
          autoCut: settings.autoCut,
          openCashDrawer: settings.openCashDrawer
        })
      }).catch(err => console.warn('Could not sync to local server:', err))
    }

    setSaveSuccess(true)
    setStatusMessage({ type: 'success', text: 'Printer settings saved successfully!' })
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const handleTestPrint = async () => {
    setTestingPrint(true)
    setStatusMessage(null)

    const payload = {
      printerName: settings.printerName,
      printerType: settings.printerType || 'EPSON',
      autoCut: settings.autoCut,
      openCashDrawer: settings.openCashDrawer,
      header: {
        name: settings.restaurantName,
        tagline: settings.restaurantTagline,
        address: settings.address,
        phone: settings.phone,
        gstin: settings.gstNumber,
        headerNote: 'PRINTER SETUP TEST'
      },
      footer: {
        note: settings.footerNote || 'Printer setup test successful!'
      },
      bill: {
        billNo: 'TEST-001',
        tableNo: 'T-01',
        date: new Date().toLocaleString('en-IN'),
        customerName: 'Test Customer',
        paymentType: 'CASH',
        items: [
          { name: 'Paneer Butter Masala', qty: 1, total: 240.00 },
          { name: 'Butter Naan', qty: 2, total: 80.00 },
          { name: 'Jeera Rice', qty: 1, total: 140.00 }
        ],
        subtotal: 460.00,
        tax: 23.00,
        grandTotal: 483.00
      }
    }

    const endpoint = settings.useLocalServer
      ? `${settings.serverUrl}/print`
      : '/api/printer/print'

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: `Success! Test receipt printed on '${settings.printerName}' without popup dialog.`
        })
      } else {
        throw new Error(data.error || 'Failed to print test receipt')
      }
    } catch (err) {
      console.error('Test print error:', err)
      setStatusMessage({
        type: 'error',
        text: `Print Error: ${err.message}. Verify printer is turned on and connected via USB.`
      })
    } finally {
      setTestingPrint(false)
    }
  }

  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Printer className="h-7 w-7 text-orange-600" />
                    Thermal Printer Setup & Settings
                  </h1>
                  <p className="text-sm text-gray-600">
                    Configure your USB thermal printer (DC RP30, POS-80) for silent direct printing without browser popups.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleScanPrinters}
                    variant="outline"
                    className="flex items-center gap-2 border-orange-200 text-orange-700 hover:bg-orange-50"
                    disabled={loadingPrinters}
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingPrinters ? 'animate-spin' : ''}`} />
                    Scan Printers
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saveSuccess ? 'Saved!' : 'Save Settings'}
                  </Button>
                </div>
              </div>

              {/* Status Alert Banner */}
              {statusMessage && (
                <div
                  className={`p-4 rounded-lg flex items-center justify-between border ${
                    statusMessage.type === 'success'
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : statusMessage.type === 'error'
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : 'bg-blue-50 border-blue-200 text-blue-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {statusMessage.type === 'success' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                    {statusMessage.type === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
                    {statusMessage.type === 'info' && <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />}
                    <span className="text-sm font-medium">{statusMessage.text}</span>
                  </div>
                  <button
                    onClick={() => setStatusMessage(null)}
                    className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Main Setup Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column - Printer Connection & Service Status */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Service Status */}
                  <Card className="border-orange-100 shadow-sm">
                    <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
                      <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
                        <Server className="h-5 w-5 text-orange-600" />
                        Print Server & Connection Status
                      </CardTitle>
                      <CardDescription>
                        Status of the local print server service running on this laptop
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3">
                          {serverStatus.online ? (
                            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                          ) : (
                            <div className="h-3 w-3 rounded-full bg-red-500" />
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">
                              {serverStatus.online ? 'Print Server Active' : 'Print Server Offline'}
                            </p>
                            <p className="text-xs text-gray-500">{serverStatus.message}</p>
                          </div>
                        </div>

                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          serverStatus.online ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {serverStatus.online ? 'READY' : 'OFFLINE'}
                        </span>
                      </div>

                      {/* Printer Selection */}
                      <div className="space-y-4 pt-2">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Select Connected Printer (Windows Spooler)</Label>
                          <div className="mt-1 flex gap-2">
                            <Select
                              value={settings.printerName}
                              onValueChange={(val) => handleChange('printerName', val)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select printer..." />
                              </SelectTrigger>
                              <SelectContent>
                                {printersList.length > 0 ? (
                                  printersList.map((p, idx) => (
                                    <SelectItem key={idx} value={p.name}>
                                      {p.name} {p.isDefault ? '(Default)' : ''}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <>
                                    <SelectItem value="DC RP30">DC RP30 (Recommended)</SelectItem>
                                    <SelectItem value="POS-80">POS-80</SelectItem>
                                    <SelectItem value="Generic / Text Only">Generic / Text Only</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Select the exact printer name as shown in Windows Devices & Printers.
                          </p>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-gray-700">Custom Printer Name (If not listed above)</Label>
                          <Input
                            value={settings.printerName}
                            onChange={(e) => handleChange('printerName', e.target.value)}
                            placeholder="e.g. DC RP30 or POS-80"
                            className="mt-1"
                          />
                        </div>
                      </div>

                      {/* Test Printer Actions */}
                      <div className="pt-4 border-t flex flex-wrap items-center gap-3">
                        <Button
                          onClick={handleTestPrint}
                          disabled={testingPrint}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                        >
                          <Zap className="h-4 w-4" />
                          {testingPrint ? 'Printing Test...' : 'Print Test Receipt'}
                        </Button>

                        <p className="text-xs text-gray-500 italic">
                          Clicking &quot;Print Test Receipt&quot; will send a sample receipt directly to your printer without opening any dialog.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Print Modes & Behavior */}
                  <Card className="shadow-sm">
                    <CardHeader className="border-b">
                      <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
                        <Sliders className="h-5 w-5 text-orange-600" />
                        Printing Execution Mode
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        <div
                          onClick={() => handleChange('printMode', 'thermal')}
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                            settings.printMode === 'thermal'
                              ? 'border-orange-600 bg-orange-50/50 shadow-sm'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-gray-900">Direct Thermal Print</span>
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-bold">Fastest</span>
                          </div>
                          <p className="text-xs text-gray-600">
                            Prints directly to USB thermal printer via ESC/POS commands. Zero popups, 1-click execution.
                          </p>
                        </div>

                        <div
                          onClick={() => handleChange('printMode', 'browser')}
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                            settings.printMode === 'browser'
                              ? 'border-orange-600 bg-orange-50/50 shadow-sm'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-gray-900">Standard Browser Print</span>
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Fallback</span>
                          </div>
                          <p className="text-xs text-gray-600">
                            Opens default browser print window dialog. Requires pressing Enter to confirm.
                          </p>
                        </div>

                      </div>

                      {/* Toggles */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        
                        <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.autoCut}
                            onChange={(e) => handleChange('autoCut', e.target.checked)}
                            className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500"
                          />
                          <div>
                            <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                              <Scissors className="h-4 w-4 text-gray-600" />
                              Auto Cut Paper
                            </span>
                            <p className="text-xs text-gray-500">Send cut command after printing receipt</p>
                          </div>
                        </label>

                        <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.openCashDrawer}
                            onChange={(e) => handleChange('openCashDrawer', e.target.checked)}
                            className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500"
                          />
                          <div>
                            <span className="text-sm font-medium text-gray-900">Open Cash Drawer</span>
                            <p className="text-xs text-gray-500">Trigger cash drawer RJ11 pulse</p>
                          </div>
                        </label>

                      </div>
                    </CardContent>
                  </Card>

                </div>

                {/* Right Column - Receipt Design & Shop Header */}
                <div className="space-y-6">
                  
                  <Card className="shadow-sm">
                    <CardHeader className="border-b">
                      <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
                        <Store className="h-5 w-5 text-orange-600" />
                        Receipt Header & Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      
                      <div>
                        <Label className="text-xs font-semibold text-gray-700">Restaurant Name</Label>
                        <Input
                          value={settings.restaurantName}
                          onChange={(e) => handleChange('restaurantName', e.target.value)}
                          placeholder="ParamMitra Restaurant"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-gray-700">Tagline / Subtitle</Label>
                        <Input
                          value={settings.restaurantTagline}
                          onChange={(e) => handleChange('restaurantTagline', e.target.value)}
                          placeholder="Delicious Food, Great Service"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-gray-700">Address</Label>
                        <Input
                          value={settings.address}
                          onChange={(e) => handleChange('address', e.target.value)}
                          placeholder="Barwaha Maheshwar road..."
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-gray-700">Phone Number</Label>
                        <Input
                          value={settings.phone}
                          onChange={(e) => handleChange('phone', e.target.value)}
                          placeholder="8085902662"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-gray-700">GSTIN Number</Label>
                        <Input
                          value={settings.gstNumber}
                          onChange={(e) => handleChange('gstNumber', e.target.value)}
                          placeholder="23EQDPP8494L1Z3"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-gray-700">Footer Note</Label>
                        <Input
                          value={settings.footerNote}
                          onChange={(e) => handleChange('footerNote', e.target.value)}
                          placeholder="Thank you! Visit again."
                          className="mt-1"
                        />
                      </div>

                    </CardContent>
                  </Card>

                  {/* Paper Format */}
                  <Card className="shadow-sm">
                    <CardHeader className="border-b">
                      <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
                        <FileText className="h-5 w-5 text-orange-600" />
                        Paper Size & Driver Type
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      
                      <div>
                        <Label className="text-xs font-semibold text-gray-700">Thermal Roll Size</Label>
                        <Select
                          value={settings.paperWidth}
                          onValueChange={(val) => handleChange('paperWidth', val)}
                        >
                          <SelectTrigger className="mt-1 w-full">
                            <SelectValue placeholder="Select paper size" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="80mm">80mm (3 Inch Standard)</SelectItem>
                            <SelectItem value="58mm">58mm (2 Inch Compact)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-gray-700">Command Set Driver</Label>
                        <Select
                          value={settings.printerType}
                          onValueChange={(val) => handleChange('printerType', val)}
                        >
                          <SelectTrigger className="mt-1 w-full">
                            <SelectValue placeholder="Select command type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EPSON">EPSON Compatible (ESC/POS Standard)</SelectItem>
                            <SelectItem value="STAR">STAR Line Mode</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                    </CardContent>
                  </Card>

                </div>

              </div>

            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
