// Utility helper for managing Thermal Printer settings and direct silent printing

export const DEFAULT_PRINTER_SETTINGS = {
  printerName: 'DC RP30', // Windows printer name (e.g. DC RP30, POS-80, Generic / Text Only)
  interfaceType: 'printer', // 'printer' for OS queue, 'tcp' for IP, 'serial' for COM
  serverUrl: 'http://localhost:4000', // Standalone node print server
  useLocalServer: true, // If true, calls standalone server at serverUrl; if false, uses Next.js API /api/printer/print
  paperWidth: '80mm', // '80mm' or '58mm'
  characterWidth: 48, // 48 chars for 80mm, 32 chars for 58mm
  printerType: 'EPSON', // EPSON or STAR
  autoCut: true,
  openCashDrawer: false,
  autoPrintOnSave: false,
  printMode: 'thermal', // 'thermal' (silent) or 'browser' (window.print popup)
  restaurantName: 'ParamMitra Restaurant',
  restaurantTagline: 'Delicious Food, Great Service',
  address: 'Barwaha Maheshwar road, Dhargaon',
  phone: '8085902662',
  gstNumber: '23EQDPP8494L1Z3',
  headerNote: 'TAX INVOICE',
  footerNote: 'Thank you for dining with us! Visit again.',
}

// Get saved printer settings from localStorage or defaults
export function getStoredPrinterSettings() {
  if (typeof window === 'undefined') return DEFAULT_PRINTER_SETTINGS
  try {
    const saved = localStorage.getItem('thermal_printer_settings')
    if (saved) {
      return { ...DEFAULT_PRINTER_SETTINGS, ...JSON.parse(saved) }
    }
  } catch (err) {
    console.error('Failed to load printer settings:', err)
  }
  return DEFAULT_PRINTER_SETTINGS
}

// Save printer settings to localStorage
export function saveStoredPrinterSettings(settings) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('thermal_printer_settings', JSON.stringify(settings))
  } catch (err) {
    console.error('Failed to save printer settings:', err)
  }
}

// Fetch installed printers from system (via Next.js backend API or local print server)
export async function getSystemPrinters(serverUrl = 'http://localhost:4000') {
  // First try local print server
  try {
    const res = await fetch(`${serverUrl}/printers`, { signal: AbortSignal.timeout(2000) })
    if (res.ok) {
      const data = await res.json()
      if (data.printers && Array.isArray(data.printers)) {
        return { success: true, printers: data.printers, source: 'local-server' }
      }
    }
  } catch {
    // Fallback to Next.js API route
  }

  try {
    const res = await fetch('/api/printer/list')
    if (res.ok) {
      const data = await res.json()
      if (data.printers && Array.isArray(data.printers)) {
        return { success: true, printers: data.printers, source: 'nextjs-api' }
      }
    }
  } catch (err) {
    console.error('Failed to fetch system printers:', err)
  }

  return { success: false, printers: [], error: 'Could not connect to printer backend service' }
}

// Check printer service health
export async function checkPrinterServiceStatus(serverUrl = 'http://localhost:4000') {
  // Try standalone print server on port 4000
  try {
    const res = await fetch(`${serverUrl}/status`, { signal: AbortSignal.timeout(2000) })
    if (res.ok) {
      const data = await res.json()
      return { online: true, type: 'standalone', message: 'Local Print Server (Port 4000) Active', ...data }
    }
  } catch {
    // Check Next.js API
  }

  try {
    const res = await fetch('/api/printer/list', { signal: AbortSignal.timeout(2000) })
    if (res.ok) {
      return { online: true, type: 'nextjs', message: 'Next.js Embedded Printer API Active' }
    }
  } catch (err) {
    console.error('Health check failed:', err)
  }

  return { online: false, type: 'none', message: 'Print server unavailable. Start print server or check connection.' }
}

// Send bill to direct print backend (silent print)
export async function printThermalBill(billData, customSettings = null) {
  const settings = customSettings || getStoredPrinterSettings()

  if (settings.printMode === 'browser') {
    // Fallback to browser print window
    window.print()
    return { success: true, mode: 'browser' }
  }

  const payload = {
    printerName: settings.printerName,
    printerType: settings.printerType || 'EPSON',
    autoCut: settings.autoCut ?? true,
    openCashDrawer: settings.openCashDrawer ?? false,
    paperWidth: settings.paperWidth || '80mm',
    header: {
      name: settings.restaurantName || 'ParamMitra Restaurant',
      tagline: settings.restaurantTagline || '',
      address: settings.address || '',
      phone: settings.phone || '',
      gstin: settings.gstNumber || '',
      headerNote: settings.headerNote || 'TAX INVOICE'
    },
    footer: {
      note: settings.footerNote || 'Thank you for visiting!'
    },
    bill: {
      billNo: billData.billNo || billData.bill_number || billData.id || 'N/A',
      tableNo: billData.tableNo || billData.tableName || billData.table_name || 'Parcel',
      date: billData.date || billData.created_at || new Date().toLocaleString('en-IN'),
      customerName: billData.customerName || billData.customer_name || 'Walk-in Customer',
      customerPhone: billData.customerPhone || billData.customer_phone || '',
      paymentType: billData.paymentType || billData.payment_type || billData.payment_method || 'CASH',
      items: (billData.items || []).map(item => ({
        name: item.name || item.item_name || 'Item',
        qty: parseInt(item.qty || item.quantity || 1),
        price: parseFloat(item.price || 0),
        total: parseFloat(item.total || (item.price * item.quantity) || 0)
      })),
      subtotal: parseFloat(billData.subtotal || billData.sub_total || billData.total_amount || 0),
      discount: parseFloat(billData.discount || 0),
      cgst: parseFloat(billData.cgst || billData.tax_amount / 2 || 0),
      sgst: parseFloat(billData.sgst || billData.tax_amount / 2 || 0),
      tax: parseFloat(billData.tax || billData.tax_amount || 0),
      grandTotal: parseFloat(billData.grandTotal || billData.total_amount || billData.final_amount || 0)
    }
  }

  // Determine target API endpoint
  const endpoint = settings.useLocalServer 
    ? `${settings.serverUrl || 'http://localhost:4000'}/print`
    : '/api/printer/print'

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to send print job to thermal printer')
    }

    return { success: true, data }
  } catch (err) {
    console.error('Silent print failed:', err)
    return { success: false, error: err.message }
  }
}
