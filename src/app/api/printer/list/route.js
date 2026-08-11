import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET() {
  try {
    const isWindows = process.platform === 'win32'
    let printers = []

    if (isWindows) {
      // Execute PowerShell command to query installed printers
      const command = 'powershell -Command "Get-CimInstance Win32_Printer | Select-Object Name, PortName, Default, PrinterStatus | ConvertTo-Json"'
      const { stdout } = await execAsync(command, { timeout: 5000 })
      
      if (stdout.trim()) {
        const parsed = JSON.parse(stdout)
        const items = Array.isArray(parsed) ? parsed : [parsed]
        printers = items.map(p => ({
          name: p.Name,
          portName: p.PortName,
          isDefault: Boolean(p.Default),
          status: p.PrinterStatus
        }))
      }
    } else {
      // Unix/Linux/macOS fallback using lpstat
      try {
        const { stdout } = await execAsync('lpstat -p', { timeout: 3000 })
        const lines = stdout.split('\n')
        printers = lines
          .filter(line => line.startsWith('printer'))
          .map(line => {
            const parts = line.split(' ')
            return { name: parts[1], isDefault: false }
          })
      } catch {
        printers = []
      }
    }

    return NextResponse.json({ success: true, printers })
  } catch (error) {
    console.error('Error fetching system printers:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list printers', printers: [] },
      { status: 500 }
    )
  }
}
