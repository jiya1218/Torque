import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { error } = await validateAuth(req, 'rate.calculate')
  if (error) return error

  try {
    const body = await req.json()
    const { provider, vehicleType, parameters, selectedAddonIds } = body

    // parameters could include: { age: 3, idv: 500000, ncb: 20 }

    if (!provider || !vehicleType) {
      return NextResponse.json({ error: 'Provider and vehicleType are required' }, { status: 400 })
    }

    // 1. Fetch the base rate table and its rules
    const rateTable = await prisma.rateTable.findFirst({
      where: {
        provider,
        vehicleType,
        isActive: true
      },
      include: {
        rules: true
      }
    })

    if (!rateTable) {
      return NextResponse.json({ error: 'No active rate table found for this provider and vehicle type' }, { status: 404 })
    }

    let premium = Number(rateTable.basePremium)
    const appliedRules = []

    // 2. Evaluate rules against parameters
    for (const rule of rateTable.rules) {
      let isMatch = true
      const condition = JSON.parse(typeof rule.condition === 'string' ? rule.condition : JSON.stringify(rule.condition)) as Record<string, any>
      
      // Simple exact match logic for now. Can be expanded for >, < operators.
      for (const [key, value] of Object.entries(condition)) {
        if (parameters[key] !== value) {
          isMatch = false
          break
        }
      }

      if (isMatch) {
        let modifier = 0
        if (rule.modifierType === 'percentage') {
          modifier = premium * (Number(rule.modifierValue) / 100)
        } else if (rule.modifierType === 'flat') {
          modifier = Number(rule.modifierValue)
        }
        
        premium += modifier
        appliedRules.push({
          ruleId: rule.id,
          modifier,
          type: rule.modifierType
        })
      }
    }

    // 3. Add Addons
    const appliedAddons = []
    if (selectedAddonIds && selectedAddonIds.length > 0) {
      const addons = await prisma.addon.findMany({
        where: {
          id: { in: selectedAddonIds },
          isActive: true
        }
      })

      for (const addon of addons) {
        let addonPrice = 0
        if (addon.priceType === 'percentage') {
          addonPrice = premium * (Number(addon.priceValue) / 100)
        } else if (addon.priceType === 'flat') {
          addonPrice = Number(addon.priceValue)
        }
        
        premium += addonPrice
        appliedAddons.push({
          addonId: addon.id,
          name: addon.name,
          price: addonPrice
        })
      }
    }

    return NextResponse.json({
      basePremium: rateTable.basePremium,
      finalPremium: premium,
      appliedRules,
      appliedAddons
    })

  } catch (error) {
    console.error('Rate Calculate POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
