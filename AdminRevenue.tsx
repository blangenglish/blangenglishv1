import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, Users, UserCheck, UserX, Target } from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface RevenueData {
  totalUSD: number
  totalCOP: number
  activeSubscriptions: number
  trialUsers: number
  conversionRate: number
  monthlyRevenue: Array<{ month: string; usd: number; cop: number }>
  revenueByPlan: Array<{ name: string; value: number }>
  recentPayments: Array<{
    id: string
    studentEmail: string
    planName: string
    amountUSD: number
    amountCOP: number
    paymentMethod: string
    date: string
  }>
}

const COLORS = ['oklch(0.55 0.25 285)', 'oklch(0.60 0.20 150)', 'oklch(0.65 0.18 45)', 'oklch(0.58 0.22 15)', 'oklch(0.62 0.16 220)']

export default function AdminRevenue() {
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [revenueData, setRevenueData] = useState<RevenueData>({
    totalUSD: 0,
    totalCOP: 0,
    activeSubscriptions: 0,
    trialUsers: 0,
    conversionRate: 0,
    monthlyRevenue: [],
    revenueByPlan: [],
    recentPayments: [],
  })

  useEffect(() => {
    loadRevenueData()
  }, [selectedMonth])

  const loadRevenueData = async () => {
    setLoading(true)
    try {
      const { data: subscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          student_profiles!inner(email),
          pricing_plans!inner(name, price_usd, price_cop)
        `)
        .eq('status', 'active')

      if (subsError) throw subsError

      const { data: profiles, error: profilesError } = await supabase
        .from('student_profiles')
        .select('*')

      if (profilesError) throw profilesError

      const activeCount = subscriptions?.length || 0
      const trialCount = profiles?.filter(p => p.subscription_status === 'trial').length || 0
      const totalUsers = profiles?.length || 0
      const conversion = totalUsers > 0 ? (activeCount / totalUsers) * 100 : 0

      let totalUSD = 0
      let totalCOP = 0
      const planRevenue: Record<string, number> = {}
      const monthlyData: Record<string, { usd: number; cop: number }> = {}

      subscriptions?.forEach((sub: any) => {
        const usd = sub.pricing_plans?.price_usd || 0
        const cop = sub.pricing_plans?.price_cop || 0
        totalUSD += usd
        totalCOP += cop

        const planName = sub.pricing_plans?.name || 'Unknown'
        planRevenue[planName] = (planRevenue[planName] || 0) + usd

        const date = new Date(sub.created_at)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { usd: 0, cop: 0 }
        }
        monthlyData[monthKey].usd += usd
        monthlyData[monthKey].cop += cop
      })

      const monthlyRevenue = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, data]) => ({
          month: new Date(month + '-01').toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
          usd: data.usd,
          cop: data.cop,
        }))

      const revenueByPlan = Object.entries(planRevenue).map(([name, value]) => ({
        name,
        value,
      }))

      const recentPayments = (subscriptions || [])
        .slice(0, 10)
        .map((sub: any) => ({
          id: sub.id,
          studentEmail: sub.student_profiles?.email || 'N/A',
          planName: sub.pricing_plans?.name || 'N/A',
          amountUSD: sub.pricing_plans?.price_usd || 0,
          amountCOP: sub.pricing_plans?.price_cop || 0,
          paymentMethod: sub.payment_method || 'N/A',
          date: new Date(sub.created_at).toLocaleDateString('es-ES'),
        }))

      setRevenueData({
        totalUSD,
        totalCOP,
        activeSubscriptions: activeCount,
        trialUsers: trialCount,
        conversionRate: conversion,
        monthlyRevenue,
        revenueByPlan,
        recentPayments,
      })
    } catch (error) {
      console.error('Error loading revenue data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number, currency: 'USD' | 'COP') => {
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
    }
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount)
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ingresos</h1>
            <p className="text-muted-foreground mt-2">Análisis de ingresos y suscripciones</p>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Seleccionar mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los meses</SelectItem>
              <SelectItem value="2026-01">Enero 2026</SelectItem>
              <SelectItem value="2026-02">Febrero 2026</SelectItem>
              <SelectItem value="2026-03">Marzo 2026</SelectItem>
              <SelectItem value="2026-04">Abril 2026</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Totales (USD)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(revenueData.totalUSD, 'USD')}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Totales (COP)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(revenueData.totalCOP, 'COP')}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suscripciones Activas</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{revenueData.activeSubscriptions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuarios en Prueba</CardTitle>
              <UserX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{revenueData.trialUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{revenueData.conversionRate.toFixed(1)}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tendencia</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">+12.5%</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Ingresos Mensuales</CardTitle>
              <CardDescription>Últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.01 270)" />
                  <XAxis dataKey="month" stroke="oklch(0.48 0.01 270)" />
                  <YAxis stroke="oklch(0.48 0.01 270)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(0.98 0 0)',
                      border: '1px solid oklch(0.88 0.01 270)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="usd" fill="oklch(0.55 0.25 285)" name="USD" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ingresos por Plan</CardTitle>
              <CardDescription>Distribución de ingresos</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={revenueData.revenueByPlan}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={100}
                    fill="oklch(0.55 0.25 285)"
                    dataKey="value"
                  >
                    {revenueData.revenueByPlan.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(0.98 0 0)',
                      border: '1px solid oklch(0.88 0.01 270)',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pagos Recientes</CardTitle>
            <CardDescription>Últimas 10 transacciones</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Monto USD</TableHead>
                  <TableHead>Monto COP</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : revenueData.recentPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No hay pagos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  revenueData.recentPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.studentEmail}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{payment.planName}</Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(payment.amountUSD, 'USD')}</TableCell>
                      <TableCell>{formatCurrency(payment.amountCOP, 'COP')}</TableCell>
                      <TableCell>{payment.paymentMethod}</TableCell>
                      <TableCell>{payment.date}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
