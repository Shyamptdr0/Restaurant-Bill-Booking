import { NextResponse } from 'next/server'
import { ThermalPrinter, PrinterTypes } from 'node-thermal-printer'

export async function POST(req) {
  try {
    const body = await req.json()
    const { printerName, printerType = 'EPSON', autoCut = true, openCashDrawer = false, header = {}, footer = {}, bill = {} } = body

    if (!printerName) {
      return NextResponse.json(
        { success: false, error: 'Printer name is required' },
        { status: 400 }
      )
    }

    const type = printerType === 'STAR' ? PrinterTypes.STAR : PrinterTypes.EPSON

    const printer = new ThermalPrinter({
      type: type,
      interface: `printer:${printerName}`,
      options: {
        timeout: 5000
      }
    })

    const isConnected = await printer.isPrinterConnected()
    console.log(`Sending print job to printer:${printerName}. Connected status:`, isConnected)

    // Formatter helpers
    printer.alignCenter()
    printer.bold(true)
    printer.setTextSize(1, 1)
    printer.println(header.name || 'ParamMitra Restaurant')
    printer.bold(false)
    printer.setTextNormal()

    if (header.tagline) printer.println(header.tagline)
    if (header.address) printer.println(header.address)
    if (header.phone) printer.println(`Ph: ${header.phone}`)
    if (header.gstin) printer.println(`GSTIN: ${header.gstin}`)
    printer.println(header.headerNote || 'TAX INVOICE')

    printer.drawLine()

    printer.alignLeft()
    printer.println(`Bill No: ${bill.billNo || 'N/A'}`)
    printer.println(`Table  : ${bill.tableNo || 'Parcel'}`)
    printer.println(`Date   : ${bill.date || new Date().toLocaleString('en-IN')}`)
    if (bill.customerName && bill.customerName !== 'Walk-in Customer') {
      printer.println(`Customer: ${bill.customerName}`)
    }
    if (bill.paymentType) {
      printer.println(`Payment : ${bill.paymentType}`)
    }

    printer.drawLine()

    // Items table header
    // Total line length for 80mm ~ 48 chars, 58mm ~ 32 chars
    printer.bold(true)
    printer.tableCustom([
      { text: "Item", align: "LEFT", width: 0.5 },
      { text: "Qty", align: "CENTER", width: 0.2 },
      { text: "Amt (Rs)", align: "RIGHT", width: 0.3 }
    ])
    printer.bold(false)
    printer.drawLine()

    const items = bill.items || []
    items.forEach(item => {
      printer.tableCustom([
        { text: String(item.name).substring(0, 20), align: "LEFT", width: 0.5 },
        { text: String(item.qty), align: "CENTER", width: 0.2 },
        { text: String(parseFloat(item.total).toFixed(2)), align: "RIGHT", width: 0.3 }
      ])
    })

    printer.drawLine()

    // Totals
    printer.alignRight()
    if (bill.subtotal) printer.println(`Subtotal : Rs.${parseFloat(bill.subtotal).toFixed(2)}`)
    if (bill.discount) printer.println(`Discount : -Rs.${parseFloat(bill.discount).toFixed(2)}`)
    if (bill.cgst) printer.println(`CGST (2.5%): Rs.${parseFloat(bill.cgst).toFixed(2)}`)
    if (bill.sgst) printer.println(`SGST (2.5%): Rs.${parseFloat(bill.sgst).toFixed(2)}`)

    printer.bold(true)
    printer.setTextSize(1, 1)
    printer.println(`TOTAL: Rs.${parseFloat(bill.grandTotal || 0).toFixed(2)}`)
    printer.bold(false)
    printer.setTextNormal()

    printer.drawLine()

    if (footer.note) {
      printer.alignCenter()
      printer.println(footer.note)
    }

    if (openCashDrawer) {
      printer.openCashDrawer()
    }

    if (autoCut) {
      printer.cut()
    }

    await printer.execute()

    return NextResponse.json({
      success: true,
      message: `Print job sent to ${printerName} successfully`
    })

  } catch (error) {
    console.error('Thermal print error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to print bill' },
      { status: 500 }
    )
  }
}
