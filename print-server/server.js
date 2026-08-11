const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 4000;
const CONFIG_FILE = path.join(__dirname, 'config.json');

app.use(cors());
app.use(express.json());

// Load or default config
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading config file:', err.message);
  }
  return {
    printerName: 'DC RP30',
    printerType: 'EPSON',
    paperWidth: '80mm',
    autoCut: true,
    openCashDrawer: false
  };
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving config file:', err.message);
    return false;
  }
}

// Health status
app.get('/status', (req, res) => {
  const config = loadConfig();
  res.json({
    status: 'online',
    service: 'ParamMitra Local Thermal Print Server',
    port: PORT,
    config
  });
});

// List system printers
app.get('/printers', async (req, res) => {
  try {
    let printers = [];
    if (process.platform === 'win32') {
      const command = 'powershell -Command "Get-CimInstance Win32_Printer | Select-Object Name, PortName, Default, PrinterStatus | ConvertTo-Json"';
      const { stdout } = await execAsync(command, { timeout: 5000 });
      if (stdout.trim()) {
        const parsed = JSON.parse(stdout);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        printers = items.map(p => ({
          name: p.Name,
          portName: p.PortName,
          isDefault: Boolean(p.Default),
          status: p.PrinterStatus
        }));
      }
    } else {
      try {
        const { stdout } = await execAsync('lpstat -p', { timeout: 3000 });
        printers = stdout.split('\n')
          .filter(l => l.startsWith('printer'))
          .map(l => ({ name: l.split(' ')[1], isDefault: false }));
      } catch {
        printers = [];
      }
    }

    res.json({ success: true, printers });
  } catch (err) {
    console.error('Error listing printers:', err.message);
    res.status(500).json({ success: false, error: err.message, printers: [] });
  }
});

// Save config
app.post('/config', (req, res) => {
  const currentConfig = loadConfig();
  const newConfig = { ...currentConfig, ...req.body };
  if (saveConfig(newConfig)) {
    res.json({ success: true, config: newConfig });
  } else {
    res.status(500).json({ success: false, error: 'Failed to save printer configuration' });
  }
});

// Generic ESC/POS Print Endpoint
app.post('/print', async (req, res) => {
  try {
    const config = loadConfig();
    const {
      printerName = config.printerName,
      printerType = config.printerType || 'EPSON',
      autoCut = config.autoCut ?? true,
      openCashDrawer = config.openCashDrawer ?? false,
      header = {},
      footer = {},
      bill = {}
    } = req.body;

    if (!printerName) {
      return res.status(400).json({ success: false, error: 'No printer specified or configured' });
    }

    const type = printerType === 'STAR' ? PrinterTypes.STAR : PrinterTypes.EPSON;

    const printer = new ThermalPrinter({
      type: type,
      interface: `printer:${printerName}`,
      options: { timeout: 5000 }
    });

    // Format Receipt Header
    printer.alignCenter();
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println(header.name || 'ParamMitra Restaurant');
    printer.bold(false);
    printer.setTextNormal();

    if (header.tagline) printer.println(header.tagline);
    if (header.address) printer.println(header.address);
    if (header.phone) printer.println(`Ph: ${header.phone}`);
    if (header.gstin) printer.println(`GSTIN: ${header.gstin}`);
    printer.println(header.headerNote || 'TAX INVOICE');

    printer.drawLine();

    // Bill metadata
    printer.alignLeft();
    printer.println(`Bill No: ${bill.billNo || 'N/A'}`);
    printer.println(`Table  : ${bill.tableNo || 'Parcel'}`);
    printer.println(`Date   : ${bill.date || new Date().toLocaleString('en-IN')}`);
    if (bill.customerName && bill.customerName !== 'Walk-in Customer') {
      printer.println(`Customer: ${bill.customerName}`);
    }
    if (bill.paymentType) {
      printer.println(`Payment : ${bill.paymentType}`);
    }

    printer.drawLine();

    // Table Header
    printer.bold(true);
    printer.tableCustom([
      { text: 'Item', align: 'LEFT', width: 0.5 },
      { text: 'Qty', align: 'CENTER', width: 0.2 },
      { text: 'Amt (Rs)', align: 'RIGHT', width: 0.3 }
    ]);
    printer.bold(false);
    printer.drawLine();

    // Items list
    const items = bill.items || [];
    items.forEach(item => {
      printer.tableCustom([
        { text: String(item.name || 'Item').substring(0, 20), align: 'LEFT', width: 0.5 },
        { text: String(item.qty || 1), align: 'CENTER', width: 0.2 },
        { text: String(parseFloat(item.total || 0).toFixed(2)), align: 'RIGHT', width: 0.3 }
      ]);
    });

    printer.drawLine();

    // Totals
    printer.alignRight();
    if (bill.subtotal) printer.println(`Subtotal : Rs.${parseFloat(bill.subtotal).toFixed(2)}`);
    if (bill.discount) printer.println(`Discount : -Rs.${parseFloat(bill.discount).toFixed(2)}`);
    if (bill.cgst) printer.println(`CGST (2.5%): Rs.${parseFloat(bill.cgst).toFixed(2)}`);
    if (bill.sgst) printer.println(`SGST (2.5%): Rs.${parseFloat(bill.sgst).toFixed(2)}`);

    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println(`TOTAL: Rs.${parseFloat(bill.grandTotal || 0).toFixed(2)}`);
    printer.bold(false);
    printer.setTextNormal();

    printer.drawLine();

    if (footer.note) {
      printer.alignCenter();
      printer.println(footer.note);
    }

    if (openCashDrawer) {
      printer.openCashDrawer();
    }

    if (autoCut) {
      printer.cut();
    }

    await printer.execute();
    console.log(`Print job executed successfully to printer:${printerName}`);
    res.json({ success: true, message: `Printed to ${printerName} successfully` });
  } catch (err) {
    console.error('Print execution error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Test print route
app.post('/test-print', async (req, res) => {
  const config = loadConfig();
  const testBill = {
    header: {
      name: 'ParamMitra Restaurant',
      tagline: 'TEST RECEIPT PRINT',
      headerNote: 'PRINTER SETUP TEST'
    },
    footer: {
      note: 'Thermal Printer Connected Successfully!'
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
  };

  req.body = { ...testBill, ...req.body };
  return app._router.handle(req, res, () => {});
});

app.listen(PORT, () => {
  const config = loadConfig();
  console.log(`ParamMitra Print Server running on http://localhost:${PORT}`);
  console.log(`Configured Printer: ${config.printerName || 'None'}`);
});
