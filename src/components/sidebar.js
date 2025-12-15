'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Utensils,
  PlusCircle,
 IndianRupee,
  History,
  LogOut,
  ChefHat,
  Settings
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Add Menu Item', href: '/menu/add', icon: PlusCircle },
  { name: 'Menu List', href: '/menu/list', icon: Utensils },
  { name: 'Create Bill', href: '/billing/create', icon: IndianRupee }, // Changed from Receipt to IndianRupee
  { name: 'Bill History', href: '/billing/history', icon: History },
  { name: 'Print Settings', href: '/billing/customize', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'signout' }),
      })
    } catch (error) {
      console.error('Logout error:', error)
    }
    
    localStorage.removeItem('supabase_session')
    window.location.href = '/login'
  }

  return (
    <div className="flex h-full w-64 flex-col bg-gray-50 border-r">
      <div className="flex h-20 items-center px-6 border-b">
        <div className="flex items-center space-x-3">
          <ChefHat className="h-10 w-10 text-orange-600" />
          <span className="text-2xl font-bold text-gray-900">Restaurant POS</span>
        </div>
      </div>
      
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-3 text-base font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-orange-100 text-orange-700 border-r-2 border-orange-600'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <item.icon className="mr-3 h-6 w-6" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-gray-600 hover:text-gray-900 py-3 text-base font-medium"
        >
          <LogOut className="mr-3 h-6 w-6" />
          Logout
        </Button>
      </div>
    </div>
  )
}
